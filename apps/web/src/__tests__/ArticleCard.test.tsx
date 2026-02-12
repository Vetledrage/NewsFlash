import { render, screen } from "@testing-library/react";
import { ArticleCard } from "@/features/feed/components/ArticleCard";

const article = {
  articleId: "1",
  url: "https://example.com",
  title: "Test title",
  scrapedAt: "2025-01-01T00:00:00.000Z",
  source: "Example",
  externalId: "ext-1"
};

describe("ArticleCard", () => {
  it("renders title and source", () => {
    render(<ArticleCard article={article} isActive={true} />);
    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
  });

  it("renders read more link", () => {
    render(<ArticleCard article={article} isActive={true} />);
    expect(screen.getByRole("link", { name: /read more/i })).toHaveAttribute(
      "href",
      "https://example.com"
    );
  });
});

