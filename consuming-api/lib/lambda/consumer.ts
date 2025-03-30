import { createPublishedApiApiClient } from "@martzmakes/published-api";

export const handler = async () => {
  const apiClient = createPublishedApiApiClient();

  const topping = await apiClient.getToppingByName({
    toppingName: "Pepperoni",
  });

  return topping;
};
