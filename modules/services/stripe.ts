import {
  Logger,
  MemoryZoneReadThroughCache,
  ZuploContext,
  ZuploRequest,
} from "@zuplo/runtime";
import { environment } from "@zuplo/runtime";
import { ErrorResponse } from "../types";

const STRIPE_SECRET_KEY = environment.STRIPE_SECRET_KEY;

export const stripeRequest = async (path: string, options?: RequestInit) => {
  return fetch("https://api.stripe.com" + path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    },
  }).then((res) => res.json());
};

type StripeCustomer = {
  id: string;
};

enum GetStripeDetailsErrorResponse {
  NotPayingCustomer = "You are not a paying customer... yet?",
  NoSubscription = "You don't have an active subscription.",
  NoUsage = "You don't have any usage for your subscription in Stripe",
}

export const getStripeCustomer = async ({
  stripeCustomerId,
  logger,
}: {
  stripeCustomerId: string;
  logger: Logger;
}): Promise<StripeCustomer | ErrorResponse> => {
  try {
    const customerSearchResult = await stripeRequest(
      `/v1/customers/${stripeCustomerId}`
    );

    if (customerSearchResult.data.length === 0) {
      console.warn("User not found in Stripe", stripeCustomerId);
      return new ErrorResponse(GetStripeDetailsErrorResponse.NotPayingCustomer);
    }

    return customerSearchResult.data[0] as StripeCustomer;
  } catch (err) {
    logger.error(err);
    return new ErrorResponse(
      "An error happened while looking for your subscription",
      500
    );
  }
};

type ActiveStripeSubscriptions = {
  id: string;
  customer: string;
  plan: {
    usage_type: "metered" | "licensed";
  };
  items: {
    data: {
      id: string;
    }[];
  };
};

export const getStripeSubscriptionById = async ({
  request,
  context,
}: {
  request: ZuploRequest;
  context: ZuploContext;
}): Promise<ActiveStripeSubscriptions | ErrorResponse> => {
  const stripeCustomerId = request.user?.data?.stripeCustomerId;

  if (!stripeCustomerId) {
    return new ErrorResponse(GetStripeDetailsErrorResponse.NotPayingCustomer);
  }

  const cache = new MemoryZoneReadThroughCache<ActiveStripeSubscriptions>(
    "active-stripe-subscription",
    context
  );

  const cachedData = await cache.get(stripeCustomerId);

  if (cachedData) {
    return cachedData;
  }

  const stripeCustomer = await getStripeCustomer({
    stripeCustomerId: stripeCustomerId,
    logger: context.log,
  });

  if (stripeCustomer instanceof ErrorResponse) {
    context.log.warn("customer not found in stripe", {
      stripeCustomerId: stripeCustomerId,
    });
    return stripeCustomer;
  }

  const activeSubscription = await getActiveStripeSubscription({
    stripeCustomerId: stripeCustomer.id,
    logger: context.log,
  });

  if (activeSubscription instanceof ErrorResponse) {
    return activeSubscription;
  }

  cache.put(stripeCustomerId, activeSubscription, 3600);

  return activeSubscription;
};

export const getActiveStripeSubscription = async ({
  stripeCustomerId,
  logger,
}: {
  stripeCustomerId: string;
  logger: Logger;
}): Promise<ActiveStripeSubscriptions | ErrorResponse> => {
  const customerSubscription = await stripeRequest(
    "/v1/subscriptions?customer=" + stripeCustomerId + "&status=active&limit=1"
  );

  if (customerSubscription.data?.length === 0) {
    logger.warn("customer has no subscription", {
      stripeCustomerId,
    });
    return new ErrorResponse(GetStripeDetailsErrorResponse.NoSubscription);
  }

  if (
    !customerSubscription.data[0].plan ||
    customerSubscription.data[0].status !== "active"
  ) {
    logger.warn("customer has no active subscription plan", {
      stripeCustomerId,
    });
    return new ErrorResponse(GetStripeDetailsErrorResponse.NoSubscription);
  }

  return customerSubscription.data[0];
};

type SubscriptionItemUsage = {
  total_usage: number;
};

export const getStripeProduct = async (productId: string) => {
  return stripeRequest("/v1/products/" + productId);
};

export const triggerMeteredSubscriptionItemUsage = async (
  subscriptionItemId: string,
  quantity: number
) => {
  const params = new URLSearchParams();
  params.append("quantity", quantity.toString());

  return stripeRequest(
    `/v1/subscription_items/${subscriptionItemId}/usage_records`,
    {
      body: params,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
};
