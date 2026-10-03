import createMDX from "@next/mdx";
import type { NextConfig } from "next";
const config: NextConfig = { pageExtensions: ["ts", "tsx", "mdx"] };
export default createMDX({ extension: /\.mdx?$/ })(config);
