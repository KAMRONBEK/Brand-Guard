import { HttpResponse, http } from "msw";

const prefix = "/comment-api";

/** MSW stubs for the Comment Reader API (dev when `GLOBAL_CONFIG.commentApiBaseUrl` is `/comment-api`). */
export const commentApiHandlers = [
	http.get(`${prefix}/health`, () => HttpResponse.json({ status: "ok" })),

	http.get(`${prefix}/api/accounts`, () =>
		HttpResponse.json({
			accounts: [{ username: "mock_bot" }],
		}),
	),

	http.post(`${prefix}/api/accounts`, async () => HttpResponse.json({ ok: true })),

	http.delete(`${prefix}/api/accounts/:username`, ({ params }) =>
		HttpResponse.json({ removed: String(params.username) }),
	),

	http.post(`${prefix}/api/accounts/:username/relogin`, async () => HttpResponse.json({ ok: true })),

	http.get(`${prefix}/api/monitors`, () =>
		HttpResponse.json({
			monitors: [{ id: 1, target: "brand", type: "keyword", status: "active" }],
		}),
	),

	http.post(`${prefix}/api/monitors`, async () =>
		HttpResponse.json({ id: 2, target: "new", type: "keyword", status: "active" }),
	),

	http.get(`${prefix}/api/monitors/:id`, ({ params }) =>
		HttpResponse.json({ id: Number(params.id), target: "brand", type: "keyword", status: "active" }),
	),

	http.delete(`${prefix}/api/monitors/:id`, () => HttpResponse.json({ ok: true })),

	http.patch(`${prefix}/api/monitors/:id`, async () => HttpResponse.json({ ok: true })),

	http.get(`${prefix}/api/monitors/:id/alerts`, () =>
		HttpResponse.json({
			alerts: [{ id: 101, sentiment: "negative", text: "mock alert" }],
		}),
	),

	http.post(`${prefix}/api/alerts/:id/ack`, () => HttpResponse.json({ acknowledged: true })),

	http.post(`${prefix}/api/search`, async () => HttpResponse.json({ posts: [], note: "mock" })),

	http.post(`${prefix}/api/search/caption`, async () => HttpResponse.json({ posts: [], note: "mock" })),

	http.post(`${prefix}/api/comments/fetch`, async () =>
		HttpResponse.json({
			message: "mock",
			post_url: "https://instagram.com/p/mock/",
			sentiment: { positive: 1, negative: 0, neutral: 2 },
			shortcode: "mock",
			total_comments: 3,
		}),
	),

	http.get(`${prefix}/api/comments`, ({ request }) => {
		const url = new URL(request.url);
		const postUrl = url.searchParams.get("post_url");
		return HttpResponse.json({
			comments: postUrl ? [{ id: "c1", text: "hello", sentiment: "neutral" }] : [],
			page: Number(url.searchParams.get("page") ?? 1),
		});
	}),

	http.get(`${prefix}/api/comments/stats`, () =>
		HttpResponse.json({
			positive: 2,
			negative: 1,
			neutral: 5,
		}),
	),

	http.get(`${prefix}/api/comments/export`, ({ request }) => {
		const url = new URL(request.url);
		const format = url.searchParams.get("format") ?? "json";
		if (format === "csv") {
			return new HttpResponse("text,sentiment\nhello,neutral\n", {
				headers: { "Content-Type": "text/csv; charset=utf-8" },
			});
		}
		return HttpResponse.json([{ text: "hello" }]);
	}),

	http.post(`${prefix}/api/comments/post`, async () => HttpResponse.json({ ok: true })),

	http.post(`${prefix}/api/campaign`, async () => HttpResponse.json({ ok: true, note: "mock campaign" })),

	http.post(`${prefix}/api/account/analyze`, async () => HttpResponse.json({ username: "mock", aggregates: {} })),
];
