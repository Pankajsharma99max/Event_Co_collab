import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmitWizard } from "@/components/submit-wizard";

export const metadata = { title: "Submit an event — Devnovate" };

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <SubmitWizard />
    </div>
  );
}
