import { supabase } from "./supabaseClient.js";

const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

/*
 * ---------------------------------------------------------
 * AUTH
 * ---------------------------------------------------------
 */

async function getAccessToken() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Could not get Supabase session:", error);
      return null;
    }

    return session?.access_token || null;
  } catch (error) {
    console.error("Could not get access token:", error);
    return null;
  }
}

async function refreshSession() {
  try {
    const { data, error } =
      await supabase.auth.refreshSession();

    if (error || !data?.session) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Could not refresh Supabase session:", error);
    return false;
  }
}

async function authHeaders(extra = {}) {
  const token = await getAccessToken();

  if (!token) {
    return {
      ...extra,
    };
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

/*
 * ---------------------------------------------------------
 * GENERIC REQUEST
 * ---------------------------------------------------------
 */

async function request(
  path,
  {
    method = "GET",
    body,
    formData = false,
    retry = true,
  } = {}
) {
  const headers = await authHeaders();

  const options = {
    method,
    headers,
  };

  if (body !== undefined) {
    if (formData) {
      options.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  let response = await fetch(
    `${API_BASE}${path}`,
    options
  );

  /*
   * Refresh expired token once.
   */

  if (response.status === 401 && retry) {
    const refreshed = await refreshSession();

    if (refreshed) {
      const retryHeaders = await authHeaders();

      const retryOptions = {
        method,
        headers: retryHeaders,
      };

      if (body !== undefined) {
        if (formData) {
          retryOptions.body = body;
        } else {
          retryHeaders["Content-Type"] =
            "application/json";

          retryOptions.body = JSON.stringify(body);
        }
      }

      response = await fetch(
        `${API_BASE}${path}`,
        retryOptions
      );
    }
  }

  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();

  let parsed = {};

  try {
    parsed = raw
      ? JSON.parse(raw)
      : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    let message =
      parsed.detail ||
      parsed.message ||
      `Request failed (${response.status})`;

    /*
     * FastAPI HTTPException detail can itself be an object.
     */

    if (
      typeof message === "object" &&
      message !== null
    ) {
      const error = new Error(
        message.message ||
          "The request could not be completed."
      );

      error.status = response.status;
      error.code = message.code;
      error.details = message;

      throw error;
    }

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }

  return parsed;
}

/*
 * ---------------------------------------------------------
 * CONVERSATIONS
 * ---------------------------------------------------------
 */

export const listConversations = () =>
  request("/conversations");

export const createConversation = (title) =>
  request("/conversations", {
    method: "POST",
    body: title
      ? { title }
      : {},
  });

export const getConversation = (id) =>
  request(`/conversations/${id}`);

export const deleteConversation = (id) =>
  request(`/conversations/${id}`, {
    method: "DELETE",
  });

export const updateConversation = (
  id,
  title
) =>
  request(`/conversations/${id}`, {
    method: "PATCH",
    body: {
      title,
    },
  });

/*
 * ---------------------------------------------------------
 * MESSAGES
 * ---------------------------------------------------------
 */

export const listMessages = (id) =>
  request(`/conversations/${id}/messages`);

export const addMessage = (
  id,
  role,
  content
) =>
  request(`/conversations/${id}/messages`, {
    method: "POST",
    body: {
      role,
      content,
    },
  });

export const chat = (
  id,
  content
) =>
  request(`/conversations/${id}/chat`, {
    method: "POST",
    body: {
      content,
    },
  });

/*
 * ---------------------------------------------------------
 * THESIS PROJECT
 * ---------------------------------------------------------
 */

export const createThesisProject = (
  payload
) =>
  request("/thesis/projects", {
    method: "POST",
    body: payload,
  });

export const getThesisProject = (
  id
) =>
  request(`/thesis/projects/${id}`);

export const updateThesisProject = (
  id,
  payload
) =>
  request(`/thesis/projects/${id}`, {
    method: "PATCH",
    body: payload,
  });

/*
 * ---------------------------------------------------------
 * DATASET
 * ---------------------------------------------------------
 */

export const uploadThesisDataset = (
  id,
  file
) => {
  const form = new FormData();

  form.append("file", file);

  return request(
    `/thesis/projects/${id}/upload`,
    {
      method: "POST",
      body: form,
      formData: true,
    }
  );
};

/*
 * ---------------------------------------------------------
 * DATASET VERSIONS
 * ---------------------------------------------------------
 *
 * Uploading a dataset persists an immutable original artifact
 * plus a separately-versioned cleaned candidate. The cleaned
 * version must be validated, then activated, before an
 * analysis plan can be built.
 */

export const listDatasetVersions = (
  id
) =>
  request(`/thesis/projects/${id}/datasets`);

export const getDatasetVersion = (
  id,
  versionId
) =>
  request(
    `/thesis/projects/${id}/datasets/${versionId}`
  );

export const validateDatasetVersion = (
  id,
  versionId
) =>
  request(
    `/thesis/projects/${id}/datasets/${versionId}/validate`,
    {
      method: "POST",
    }
  );

export const activateDatasetVersion = (
  id,
  versionId
) =>
  request(
    `/thesis/projects/${id}/datasets/${versionId}/activate`,
    {
      method: "POST",
    }
  );

/*
 * ---------------------------------------------------------
 * ANALYSIS PLAN
 * ---------------------------------------------------------
 */

export const buildAnalysisPlan = (
  id
) =>
  request(
    `/thesis/projects/${id}/plan`,
    {
      method: "POST",
    }
  );

/*
 * ---------------------------------------------------------
 * STATISTICAL ANALYSIS
 * ---------------------------------------------------------
 *
 * Backend returns:
 *
 * {
 *   ...results,
 *   credits_used,
 *   credits_remaining
 * }
 */

export const runThesisAnalysis = (
  id
) =>
  request(
    `/thesis/projects/${id}/run`,
    {
      method: "POST",
    }
  );

/*
 * ---------------------------------------------------------
 * CHAPTER 4
 * ---------------------------------------------------------
 *
 * Chapter 4 is a DOCX stream, so we preserve the
 * credit headers returned by FastAPI.
 */

export async function downloadChapter4(id) {
  let headers = await authHeaders();

  let response = await fetch(
    `${API_BASE}/thesis/projects/${id}/chapter4`,
    {
      headers,
    }
  );

  /*
   * Refresh once if needed.
   */

  if (response.status === 401) {
    const refreshed =
      await refreshSession();

    if (refreshed) {
      headers = await authHeaders();

      response = await fetch(
        `${API_BASE}/thesis/projects/${id}/chapter4`,
        {
          headers,
        }
      );
    }
  }

  /*
   * Error response.
   */

  if (!response.ok) {
    const body =
      await response
        .json()
        .catch(() => ({}));

    let message =
      body.detail ||
      "Could not generate the Word document.";

    if (
      typeof message === "object" &&
      message !== null
    ) {
      const error = new Error(
        message.message ||
          "You do not have enough credits."
      );

      error.status = response.status;
      error.code = message.code;
      error.details = message;

      throw error;
    }

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }

  return {
    blob: await response.blob(),

    creditsUsed: Number(
      response.headers.get(
        "X-Credits-Used"
      ) || 0
    ),

    creditsRemaining: Number(
      response.headers.get(
        "X-Credits-Remaining"
      ) || 0
    ),
  };
}

/*
 * ---------------------------------------------------------
 * CREDITS
 * ---------------------------------------------------------
 */

export const getCredits = () =>
  request("/credits");

export const getCreditTransactions = () =>
  request("/credits/transactions");

/*
 * ---------------------------------------------------------
 * PAYMENTS
 * ---------------------------------------------------------
 */

export const checkoutCredits = (
  packageId
) =>
  request("/credits/checkout", {
    method: "POST",
    body: {
      package_id: packageId,
    },
  });

export const verifyCreditPayment = (
  reference
) =>
  request(
    `/credits/verify/${encodeURIComponent(
      reference
    )}`,
    {
      method: "POST",
    }
  );

/*
 * ---------------------------------------------------------
 * LEGACY / SIMPLE ANALYSIS ENDPOINTS
 * ---------------------------------------------------------
 */

export const uploadFile = (
  file
) => {
  const form = new FormData();

  form.append("file", file);

  return request("/upload", {
    method: "POST",
    body: form,
    formData: true,
  });
};

export const suggestColumns = (
  sessionId,
  researchQuestion
) => {
  const form = new FormData();

  form.append(
    "session_id",
    sessionId
  );

  form.append(
    "research_question",
    researchQuestion
  );

  return request("/suggest-columns", {
    method: "POST",
    body: form,
    formData: true,
  });
};

export const analyze = (
  sessionId,
  columnA,
  columnB
) => {
  const form = new FormData();

  form.append(
    "session_id",
    sessionId
  );

  form.append(
    "column_a",
    columnA
  );

  form.append(
    "column_b",
    columnB
  );

  return request("/analyze", {
    method: "POST",
    body: form,
    formData: true,
  });
};