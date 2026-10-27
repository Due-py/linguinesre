import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Phòng thử nghiệm · LinguaReflex",
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: LayoutProps<"/lab">) {
  return children;
}
