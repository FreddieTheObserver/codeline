import type { Metadata } from "next";
import { TaOverviewView } from "./TaOverviewView";

export const metadata: Metadata = { title: "Department overview" };

export default function TaPage() {
  return <TaOverviewView />;
}
