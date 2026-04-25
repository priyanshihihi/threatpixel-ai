import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useExtraction";

const QUICK = [
  "How does LSB extraction work?",
  "What does CRITICAL risk mean?",
  "How does File Appending detection work?",
  "How do I report a cybercrime in India?",
  "Explain DCT steganography",
  "What is Spread Spectrum technique?",
];

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="terminal-text px-1.5 py-0.5 rounded bg-primary/10 text-xs">$1</code>')
    .replace(/\n/g, "<br />");
}

export default function ChatBot() {
  const { messages, send, loading } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    send(msg);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-card/40">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
        </div>
        <div>
          <p className="text-sm font-semibold">PixelGuard AI</p>
          <p className="text-xs text-primary font-mono">Steganography forensics assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-fade-in-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center border ${
              msg.role === "bot"
                ? "bg-primary/10 border-primary/25 text-primary"
                : "bg-secondary border-border/50 text-muted-foreground"
            }`}>
              {msg.role === "bot" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            {/* Bubble */}
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "bot"
                ? "bg-secondary/60 border border-border/40 text-foreground rounded-tl-none"
                : "bg-primary/15 border border-primary/25 text-foreground rounded-tr-none"
            }`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
            />
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in-up">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-secondary/60 border border-border/40 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground font-mono text-xs">Processing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs font-mono px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 flex gap-2 bg-card/40">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about steganography techniques, results, reporting..."
          className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
        />
        <button
          onClick={submit}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
