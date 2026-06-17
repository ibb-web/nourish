import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_dashboard/recipes/$id")({ component: DashboardRecipeRedirect });

function DashboardRecipeRedirect() {
  const navigate = useNavigate();
  const { id } = useParams({ from: "/_dashboard/recipes/$id" });
  useEffect(() => {
    if (id) navigate({ to: "/recipe/$id", params: { id } });
  }, [id, navigate]);
  return null;
}
