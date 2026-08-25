import type { Metadata } from "next";
import { MemberPortal } from "../../member/MemberPortal";

export const metadata: Metadata = {
  title: "MetroHub for business",
  description: "List your business and manage your MetroHub Marketplace presence.",
};

export default function MemberPage() {
  return <MemberPortal />;
}
