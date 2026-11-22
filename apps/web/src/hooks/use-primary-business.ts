import { useBusinesses } from "./use-businesses";

export function usePrimaryBusiness() {
  const query = useBusinesses();

  return {
    ...query,
    business: query.data?.[0] ?? null,
  };
}
