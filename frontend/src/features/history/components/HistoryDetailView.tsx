import { PostHistoryDetail } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, CheckCircle, Copy, Flag, Heart, Tag, Palette, Code2, Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { STATUS_LABELS } from "@/constants/playground";

interface HistoryDetailViewProps {
  post: import("@/types").PostHistoryDetail;
  onClose?: () => void;
  statusLabels?: Record<
    string,
    { label: string; variant: "primary" | "success" | "warning" | "danger" | "neutral" }
  >;
  handleCopy?: (text: string, msg?: string) => void;
}

export function HistoryDetailView({
  post,
  onClose,
  statusLabels = STATUS_LABELS,
  handleCopy = (text) => navigator.clipboard.writeText(text),
}: {
  post: import("@/types").PostHistoryDetail;
  onClose?: () => void;
  statusLabels?: Record<
    string,
    { label: string; variant: "primary" | "success" | "warning" | "danger" | "neutral" }
  >;
  handleCopy?: (text: string, msg?: string) => void;
}) {
  const codeExamples = post.posts_data
    ? post.posts_data.flatMap(function(postItem) {
        const codeBlocks = postItem.content.match(/```[\s\S]*?```/g) || [];
        return codeBlocks.map(function(block, blockIndex) {
          return {
            content: block,
            blockIndex: blockIndex,
          };
        });
      })
    : [];

  return (
    <div className="space-y-5 max-h-[85vh] overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary">{post.style}</Badge>
        <Badge variant="outline">{post.audience}</Badge>
        <Badge variant="outline">{post.experience}</Badge>
        <Badge variant="outline">{post.objective}</Badge>
        <Badge variant="outline">{post.format}</Badge>
        {post.is_favorite && (
          <Badge variant="danger">
            <Heart className="h-3 w-3 mr-1" /> Favorite
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm p-4 bg-surface-100 dark:bg-surface-800/50 rounded-xl">
        <div>
          <span className="text-surface-500">Created at:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {new Date(post.created_at).toLocaleString("pt-BR")}
          </span>
        </div>
        <div>
          <span className="text-surface-500">Updated at:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {new Date(post.updated_at).toLocaleString("pt-BR")}
          </span>
        </div>
        {post.completed_at && (
          <div>
            <span className="text-surface-500">Completed at:</span>{" "}
            <span className="text-surface-900 dark:text-surface-50 ml-2">
              {new Date(post.completed_at).toLocaleString("pt-BR")}
            </span>
          </div>
        )}
        <div>
          <span className="text-surface-500">Experience:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {post.experience}
          </span>
        </div>
        <div>
          <span className="text-surface-500">Objective:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {post.objective}
          </span>
        </div>
        <div>
          <span className="text-surface-500">Include Code:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {post.include_code ? "Yes" : "No"}
          </span>
        </div>
        <div>
          <span className="text-surface-500">Include Visual:</span>{" "}
          <span className="text-surface-900 dark:text-surface-50 ml-2">
            {post.include_visual ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
          <span className="text-xs text-surface-500">Tags:</span>
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline">#{tag}</Badge>
          ))}
        </div>
      )}

      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3">
          Generated Posts
        </h4>
        <div className="space-y-3">
          {post.posts_data?.map((p, i) => (
            <Card key={i} variant="bordered">
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    Variation {p.variation}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(p.content)}
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                  >
                    Copy
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 max-h-64 overflow-y-auto font-sans">
                  {p.content}
                </pre>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4" /> Hashtags
          </h4>
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((h: any) => (
              <Badge
                key={h.tag}
                variant="outline"
                onClick={() => handleCopy(h.tag)}
                className="cursor-pointer"
              >
                #{h.tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {post.hooks && post.hooks.length > 0 && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Flag className="h-4 w-4" /> Hooks
          </h4>
          <div className="space-y-2">
            {post.hooks.map((h: any, i: number) => (
              <Card key={i} variant="bordered">
                <CardBody className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="primary" size="sm" className="mb-1">
                        {h.type}
                      </Badge>
                      <p className="text-sm text-surface-900 dark:text-surface-50 font-medium">
                        {h.text}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        {h.why_it_works}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(h.text)}
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      Copy
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {post.review && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3">
            Review
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Strengths
              </h5>
              <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                {post.review.strengths?.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Improvements
              </h5>
              <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                {post.review.improvements?.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-500" /> Suggestions
            </h4>
            <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
              {post.review.suggestions?.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">→</span>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {post.visual_suggestion && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" /> Visual
          </h4>
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {post.visual_suggestion.visual_description}
            </p>
            {post.visual_suggestion.code_example && (
              <div>
                <label className="label">Code Example ({post.visual_suggestion.code_language})</label>
                <pre className="bg-surface-900 dark:bg-surface-950 text-surface-100 dark:text-surface-50 p-3 rounded-lg text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">{post.visual_suggestion.code_example}</pre>
              </div>
            )}
            <div>
              <label className="label">Suggested Tools</label>
              <div className="flex flex-wrap gap-2">
                {post.visual_suggestion.suggested_tools?.map((tool: string, i: number) => (
                  <Badge key={i} variant="neutral">{tool}</Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Composition Tips</label>
              <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                {post.visual_suggestion.composition_tips?.map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {onClose && (
        <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

export default HistoryDetailView;