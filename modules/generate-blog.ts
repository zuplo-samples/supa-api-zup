import { ZuploContext, ZuploRequest, Logger } from "@zuplo/runtime";
import { OpenAIStream } from "ai";
import { openai } from "./services/openai";
import { supabase } from "./services/supabase";
import blogSchema from "../schemas/blog.json";
import { CompletionCreateParams } from "openai/resources/chat";

const functions: CompletionCreateParams.Function[] = [
  {
    name: "blogpost",
    description: "A blog post and title",
    parameters: blogSchema,
  },
];

export default async function (request: ZuploRequest, context: ZuploContext) {
  const { orgId } = request.user?.data;

  if (!orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { topic } = await request.json();

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0613",
    stream: true,
    messages: [
      {
        role: "user",
        content: `Give me a 100 words blog about the following topic ${topic}.`,
      },
    ],
    functions,
  });

  const stream = OpenAIStream(response, {
    // this is so we don't block the response from being sent to the client
    // while we save the blog to the database
    onCompletion: async (completion) => {
      await saveBlogtoDatabase(completion, orgId, context.log);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}

type FunctionResponse = {
  function_call: {
    arguments: string;
    name: string;
  };
};

const saveBlogtoDatabase = async (
  blog: string,
  orgId: string,
  logger: Logger
): Promise<"success" | null> => {
  try {
    const functionResponse = JSON.parse(blog) as FunctionResponse;

    const { content, title } = JSON.parse(
      functionResponse.function_call.arguments
    );

    const { error } = await supabase
      .from("blogs")
      .insert({ content, title, orgId });

    if (error) {
      logger.error(error);
      return null;
    }

    return "success";
  } catch (err) {
    logger.error(err);
    return null;
  }
};
