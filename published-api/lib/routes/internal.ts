import { join } from "path";
import {
  ApiClientDefinition,
  ApiEndpoint,
} from "@martzmakes/api-constructs/lib/interfaces";
import { ToppingsResponse } from "../interfaces/ToppingsResponse";
import { SearchToppingsRequest } from "../interfaces/SearchToppingsRequest";
import { Topping } from "../interfaces/Topping";
// import { ITable } from "aws-cdk-lib/aws-dynamodb";

interface EndpointResources {
  // table: ITable;
}

export const endpoints: ApiClientDefinition<{
  getToppingByName: ApiEndpoint<"GET", never, Topping, EndpointResources>;
  getToppings: ApiEndpoint<"GET", never, ToppingsResponse, EndpointResources>;
  searchToppings: ApiEndpoint<
    "POST",
    SearchToppingsRequest,
    ToppingsResponse,
    EndpointResources
  >;
}> = {
  getToppingByName: {
    path: "toppings/{toppingName}",
    method: "GET",
    entry: join(__dirname, "../lambda/internal/getToppings.ts"),
    lambdaGenerator: (resources) => ({
      // dynamos: {
      //   TABLE_NAME: {
      //     table: resources.table,
      //     access: "r",
      //   },
      // },
    }),
  },
  getToppings: {
    path: "institutions/{institutionName}/cards",
    method: "GET",
    entry: join(__dirname, "../lambda/internal/getToppings.ts"),
    lambdaGenerator: (resources) => ({
      // dynamos: {
      //   TABLE_NAME: {
      //     table: resources.table,
      //     access: "r",
      //   },
      // },
    }),
  },
  searchToppings: {
    path: "toppings",
    method: "POST",
    entry: join(__dirname, "../lambda/internal/searchToppings.ts"),
    lambdaGenerator: (resources) => ({
      // dynamos: {
      //   TABLE_NAME: {
      //     table: resources.table,
      //     access: "r",
      //   },
      // },
    }),
  },
};
