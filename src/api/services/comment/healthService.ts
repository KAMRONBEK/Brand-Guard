import commentApi from "@/api/commentApi";

const health = () => commentApi.getJson<Record<string, string>>("/health");

export default { health };
