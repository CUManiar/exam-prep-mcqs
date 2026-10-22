import { redirect } from "next/navigation";

export default function UploadPage() {
  redirect("/papers?view=upload");
}
