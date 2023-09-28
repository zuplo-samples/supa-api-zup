# SupaAPI: Monetizing an API with Supabase, OpenAI and Zuplo

For the tutorial, we will be adding 2 new components to the project:

- [Stripe](https://stripe.com): a service for monetization, product and
  subscription management, and billing.
- Supa-API site: a simple web app where users can sign in and subscribe to the
  API.

This is in addition to the existing:

- [Supabase](https://supabase.com): the database and auth for the client app and
  the documentation
- [Zuplo](https://zuplo.com): the API Gateway to which your Supabase data is
  exposed and secured

### The API billing model

The type of billing we have created for this tutorial follows a
_"Pay-as-you-go"_ model of 0.01$/request (you can be less generous), which
charges customers based only on the number of requests they've made, no more and
no less. This is a pretty flexible billing type that most APIs (like OpenAI's)
use and allows users to not pay much when their use is small, but then scale
their usage (and billing) of your API progressively over time.

The billing model is just an example though, and you can build any billing model
(monthly fixed number of requests or time-based rate limits to name a few),
following the same principles as this sample.

### Life of a request to the API

The life of a request coming to your API will be like the following diagram
below, where you can see that Zuplo reports to Stripe how many requests your
API's subscribers have made.

![Diagram of a request](https://cdn.zuplo.com/assets/1dbece0e-7938-4032-8c6c-2273b80d71d4.png)

At the end of the billing period, Stripe will calculate the number of requests
the subscriber has made for the month and will send them an invoice with the
total amount.

## Demo

- https://supa-api.zuplosite.com

![SupaAPI Demo](https://cdn.zuplo.com/assets/e94a305a-3abe-4b0e-9b3a-bdf06b41f85f.png)

## Getting started

### Step 1 - Create a Stripe account and product

**1. Create a Stripe account**

You'll need a Stripe account to accept payments. You can create one [here](https://dashboard.stripe.com/register).

**2. Create a metered product in Stripe**

To enable metered billing so that you can charge users based on their API usage,
you'll need to create a metered product in Stripe.

Ensuring you are in Test mode (you'll see a toggle at the top right of the
console), go to **_Products_** and click **_Add a product_**.

Now create a product with the following details:

![Stripe Add Product Step 2](https://cdn.zuplo.com/assets/f8dd3c0c-fcc6-4375-92e3-2f61d6f0e60a.png)


### Step 2 - Deploy the API with Zuplo

For the purposes of this demo, we'll be using the [SupaAPI](https://github.com/zuplo-samples/supa-api-zup) as our API which will be monetized.

It exposes one endpoint `/v1/blogs` which can either `POST` to create a new blogpost using OpenAI, or `GET` to retrieve a list of blogposts.

Click the button below to deploy the API to Zuplo:

<a alt="Deploy to Zuplo" href="http://portal.zuplo.com/zup-it?sourceRepoUrl=https://github.com/zuplo-samples/supa-api-zup" target="_blank">
<img src="https://cdn.zuplo.com/www/zupit.svg" /> </a>

Remember to set the environment variables in **_Settings > Environment
Variables_** with the same values from your previous project:

1. `OPENAI_API_KEY`: Your OpenAPI API Key which you can get from the
   [OpenAI account dashboard](https://platform.openai.com/account/api-keys).

1. `STRIPE_SECRET_KEY`: This key is your Stripe Secret Key. You can get this in
   Stripe dashboard by clicking on Developers > API Keys. Again, be sure you're
   in test mode.
1. `SUPABASE_URL`: in Supabase, go to the **_Settings > API_** tab and copy the
   **_URL_**.

1. `SUPABASE_SERVICE_ROLE_KEY`: from the same page, copy the **_Service Role
   Key_**.

### Step 3 - Deploy to Vercel

You will deploy and configure the web app with environment variables and the
Stripe subscription table, for that, deploy the web app (you can check the
repository [here](https://github.com/zuplo-samples/supa-api-site)) using Vercel.

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzuplo-samples%2Fsupa-api-site&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,STRIPE_SECRET_KEY,NEXT_PUBLIC_ZUPLO_API_URL,ZUPLO_BUCKET_URL,ZUPLO_API_KEY&envDescription=Get%20the%20environments%20from%20your%20Zuplo%20API%2C%20Supabase%20project%20and%20Stripe%20account.%20&project-name=supa-api-site" target="_blank">
<img src="https://vercel.com/button" /> </a>

1. `STRIPE_SECRET_KEY`: This key is the Stripe Secret Key that you got in
   step 1.

1. `NEXT_PUBLIC_SUPABASE_URL`: in Supabase, go to the **_Settings > API_** tab
   and copy the **_URL_**.

1. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from the same page, copy the **_anon key_**.

1. `NEXT_PUBLIC_ZUPLO_API_URL`: in Zuplo, go to the **_Settings > Project
   Information_** tab and copy the **_URL_**.

1. `ZUPLO_BUCKET_URL`: from the same page, copy the **_API Key Bucket URL_**.

1. `ZUPLO_API_KEY`: in Zuplo, go to the **_Settings > Zuplo API Keys_** tab and
   copy the available key.

Once deployed, take note of the deployment URL as you'll need it in the next
step.

### Step 4 - Setup Auth in Supabase

Now that the frontend app is deployed, you'll need to configure Supabase Auth to
enable redirects to your web app when users sign up or sign in.

Go to **_Authentication > URL Configuration_** and add the URL of your Vercel
deployment to the **_Site URL_** field.

![Supabase Auth URL Configuration](https://cdn.zuplo.com/assets/ec3807b3-3c87-4284-a365-97a94b571ceb.png)

### Step 5 - Test the Web app by subscribing to your API

Copy the URL of your Vercel deployment and open it in your browser, sign up to
the website, which will then prompt you to subscribe to the API. This will take
you through Stripe's payment page to add your credit card details (for the demo,
you can use [Stripe's test cards](https://stripe.com/docs/testing#cards)).

Once you're done, you will automatically be redirected back to the website, and
an API Key Consumer will be created programmatically using the Zuplo API, you
can check how it works here
[here](https://github.com/zuplo-samples/supaweek-site/blob/main/app/zuplo.ts#L31-L74).
This will also add the `stripeCustomerId` to the metadata of the API Key
Consumer, which will be used by the billing module from the previous step.

You will then use your API's Developer Portal to login with your account and use
your API Key to make authenticated requests to the API.

That quick!
