import { redirect } from "next/navigation";

/** Old route — “Interested” merged into Saved (star / save). */
export default function InterestedRedirectPage() {
  redirect("/likes");
}
