"use client";

import React from "react";
import Image from "next/image";

interface Props {
  src?: string | null;
  alt?: string;
}

export default function MarketImage({ src, alt }: Props) {
  if (!src) return null;

  return (
    <Image src={src} alt={alt ?? "Market image"} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
  );
}
