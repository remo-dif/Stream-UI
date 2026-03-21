import { redirect } from "next/navigation";

/**
 * Root Page
 * 
 * The entry point of the application. It performs an immediate 
 * redirect to the /chat route as the primary interface.
 */
export default function Home() {
  redirect("/chat");
}
