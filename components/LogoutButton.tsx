import { destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function LogoutButton() {
  async function logout() {
    "use server";
    await destroySession();
    redirect("/");
  }

  return (
    <form action={logout}>
      <button type="submit" className="hover:underline cursor-pointer">
        Esci
      </button>
    </form>
  );
}
