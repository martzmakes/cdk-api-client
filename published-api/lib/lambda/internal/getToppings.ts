import {
  ApiHandler,
  initApiHandler,
} from "@martzmakes/constructs/lambda/handlers/initApiHandler";

export const apiHandler: ApiHandler<any, any> = async ({ body, headers }) => {
  return {
    statusCode: 200,
    data: {
      toppings: [
        {
          name: "Pepperoni",
          description: "Spicy and flavorful slices of pepperoni.",
        },
      ],
    },
  };
};

export const handler = initApiHandler({
  apiHandler,
});
