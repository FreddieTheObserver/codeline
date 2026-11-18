import type { Metadata } from "next";
import { TeachHome } from "./TeachHome";

export const metadata: Metadata = { title: "My courses" };

export default function TeachPage() {
  return <TeachHome />;
}
