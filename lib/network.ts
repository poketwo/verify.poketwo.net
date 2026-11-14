import crypto from "crypto";
import { isIP } from "net";
import type { NextApiRequest } from "next";
import env from "./env";

const IPV4_SUBNET_OCTETS = 3;
const IPV6_GROUPS = 8;
const IPV6_SUBNET_GROUPS = 3;
const IPV4_MAPPED_MARKER = 0xffff;
const IPV4_MAPPED_PREFIX_GROUPS = 5;
const BYTE_BITS = 8;
const BYTE_MASK = 0xff;
const ASN_PATTERN = /^\d+$/;

export type NetworkFingerprint = {
  ip_hash: string;
  subnet_hash: string;
  asn: number | null;
  key_version: number;
};

type Network = { ip: string; subnet: string };

if (env.NETWORK_COLLECTION_ENABLED && (!env.NETWORK_HASH_KEY || !env.EDGE_AUTH_SECRET)) {
  throw new Error("NETWORK_COLLECTION_ENABLED needs NETWORK_HASH_KEY and EDGE_AUTH_SECRET");
}

function header(req: NextApiRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

export function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  return aBytes.length === bBytes.length && crypto.timingSafeEqual(aBytes, bBytes);
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", env.NETWORK_HASH_KEY).update(value).digest("hex");
}

function ipv4Network(ip: string): Network {
  const octets = ip.split(".").map(Number);
  return {
    ip: octets.join("."),
    subnet: `${octets.slice(0, IPV4_SUBNET_OCTETS).join(".")}.0/24`,
  };
}

function ipv6Groups(ip: string): number[] {
  let address = ip;
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (isIP(tail) === 4) {
    const [a, b, c, d] = tail.split(".").map(Number);
    address = `${address.slice(0, lastColon + 1)}${((a << BYTE_BITS) | b).toString(16)}:${((c << BYTE_BITS) | d).toString(16)}`;
  }
  const [head, rest] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const restGroups = rest ? rest.split(":") : [];
  const zeros = rest === undefined ? [] : Array(IPV6_GROUPS - headGroups.length - restGroups.length).fill("0");
  return [...headGroups, ...zeros, ...restGroups].map((group) => parseInt(group, 16));
}

export function normaliseIp(raw: string): Network | null {
  const ip = raw.trim().toLowerCase();
  switch (isIP(ip)) {
    case 4:
      return ipv4Network(ip);
    case 6: {
      const groups = ipv6Groups(ip);
      const isMapped =
        groups.slice(0, IPV4_MAPPED_PREFIX_GROUPS).every((group) => group === 0) &&
        groups[IPV4_MAPPED_PREFIX_GROUPS] === IPV4_MAPPED_MARKER;
      if (isMapped) {
        const [high, low] = groups.slice(IPV4_MAPPED_PREFIX_GROUPS + 1);
        return ipv4Network(
          [high >> BYTE_BITS, high & BYTE_MASK, low >> BYTE_BITS, low & BYTE_MASK].join("."),
        );
      }
      const hex = groups.map((group) => group.toString(16));
      return {
        ip: hex.join(":"),
        subnet: `${hex.slice(0, IPV6_SUBNET_GROUPS).join(":")}::/48`,
      };
    }
    default:
      return null;
  }
}

/**
 * Keyed hashes of the visitor's IP and subnet, plus their ASN, from
 * Cloudflare's headers. The raw IP never leaves this function. Returns null
 * when collection is off or the request didn't come through our edge.
 */
export function networkFingerprint(req: NextApiRequest): NetworkFingerprint | null {
  if (!env.NETWORK_COLLECTION_ENABLED) return null;

  const edgeAuth = header(req, "x-edge-auth");
  if (!edgeAuth || !safeEqual(edgeAuth, env.EDGE_AUTH_SECRET)) return null;

  const rawIp = header(req, "cf-connecting-ip");
  const network = rawIp ? normaliseIp(rawIp) : null;
  if (!network) return null;

  const asn = header(req, "x-client-asn");
  return {
    ip_hash: hmac(network.ip),
    subnet_hash: hmac(network.subnet),
    asn: asn && ASN_PATTERN.test(asn) ? Number(asn) : null,
    key_version: env.NETWORK_HASH_KEY_VERSION,
  };
}
