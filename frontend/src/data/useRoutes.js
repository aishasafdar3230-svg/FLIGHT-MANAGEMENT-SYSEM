import { useEffect, useState } from "react";
import api from "../api/axios";

// Loads every origin -> destination pair that has flights (once per page).
export default function useRoutes() {
  const [routes, setRoutes] = useState([]);
  useEffect(() => {
    api
      .get("/flights/meta/routes")
      .then(({ data }) => setRoutes(data))
      .catch(() => {});
  }, []);
  return routes;
}
