import type { Metadata } from "next";
import { StudentHome } from "./StudentHome";

export const metadata: Metadata = { title: "Your valley" };

export default function HomePage() {
  return <StudentHome />;
}
