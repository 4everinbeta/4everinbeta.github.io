const brandChatKnowledge = [
  {
    keywords: ["cloud", "azure", "aws", "ali", "migration"],
    response:
      "Ryan has architected multi-cloud strategies at Visa, Arrow, and Pulte Financial Services, moving billion-dollar platforms into Azure while keeping resiliency and compliance front-and-center."
  },
  {
    keywords: ["ai", "ml", "genai", "governance", "automation"],
    response:
      "He founded the AI Center of Excellence at Pulte Financial Services and brought GenAI into mortgage production—governing risk while automating document reviews, sentiment analysis, and incentive modeling."
  },
  {
    keywords: ["cost", "efficiency", "optimize", "roi"],
    response:
      "Ryan regularly pairs innovation with discipline: Arrow realized a 30% cloud cost reduction and Pulte recognized multimillion-dollar savings through his optimization playbooks."
  },
  {
    keywords: ["team", "leadership", "coaching", "culture", "agile"],
    response:
      "He has scaled high-performing teams, bringing Scaled Agile to 100+ engineers at Arrow and mentoring architecture guilds to ship faster with better quality."
  },
  {
    keywords: ["4everinbeta", "beta", "nom de plume", "brand"],
    response:
      "4everinbeta is Ryan's reminder to stay curious, humble, and always shipping. It's drawn from his 2014 LinkedIn essay about choosing a perpetual-learning mindset."
  },
  {
    keywords: ["contact", "email", "connect", "reach"],
    response:
      "You can reach Ryan directly at ryankbrown@gmail.com or on LinkedIn at linkedin.com/in/4everinbeta."
  }
];

const fallbackResponses = [
  "I help synthesize Ryan's background. Try asking about AI, cloud, or leadership.",
  "Ryan blends deep engineering with board-level advisory chops—ask me about a specific initiative!",
  "That's a new one. Could you rephrase it around impact, teams, or technology?"
];

class BrandChat {
  constructor() {
    this.container = document.createElement("div");
    this.container.className = "brand-chat";
    this.container.innerHTML = `
      <div class="brand-chat__panel" aria-live="polite">
        <div class="brand-chat__header">
          <strong>Ask Ryan's AI concierge</strong>
          <p style="margin:0;color:var(--muted);font-size:0.85rem;">Get quick facts about his work and start the conversation.</p>
        </div>
        <div class="brand-chat__body" data-role="messages"></div>
        <form class="brand-chat__input" data-role="form">
          <input type="text" placeholder="Ask about Ryan's impact..." aria-label="Message" required />
          <button type="submit">Send</button>
        </form>
      </div>
      <button class="brand-chat__toggle" aria-expanded="false" aria-controls="brand-chat">💬</button>
    `;
    document.body.appendChild(this.container);

    this.panel = this.container.querySelector(".brand-chat__panel");
    this.toggleBtn = this.container.querySelector(".brand-chat__toggle");
    this.messages = this.container.querySelector("[data-role='messages']");
    this.form = this.container.querySelector("[data-role='form']");
    this.input = this.form.querySelector("input");

    this.toggleBtn.addEventListener("click", () => this.toggle());
    this.form.addEventListener("submit", (event) => this.handleSubmit(event));

    this.addMessage(
      "bot",
      "Hi—I'm the 4everinbeta concierge. Ask me about Ryan's AI work, digital transformation wins, or how to get in touch."
    );
  }

  toggle() {
    this.panel.classList.toggle("is-open");
    const expanded = this.panel.classList.contains("is-open");
    this.toggleBtn.setAttribute("aria-expanded", expanded.toString());
  }

  handleSubmit(event) {
    event.preventDefault();
    const value = this.input.value.trim();
    if (!value) {
      return;
    }
    this.addMessage("user", value);
    this.reply(value);
    this.input.value = "";
  }

  addMessage(sender, text) {
    const bubble = document.createElement("div");
    bubble.className = `message message--${sender}`;
    bubble.textContent = text;
    this.messages.appendChild(bubble);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  reply(text) {
    const best = this.findBestResponse(text);
    const response =
      best?.response || fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    setTimeout(() => {
      this.addMessage("bot", response);
    }, 400);
  }

  findBestResponse(text) {
    const normalized = text.toLowerCase();
    let best;
    let bestScore = 0;
    brandChatKnowledge.forEach((item) => {
      const score = item.keywords.reduce((acc, keyword) => {
        return normalized.includes(keyword.toLowerCase()) ? acc + 1 : acc;
      }, 0);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });
    return bestScore > 0 ? best : null;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new BrandChat();
  initContactForm();
});

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) {
    return;
  }
  const status = form.querySelector(".contact-form__status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get("name")?.trim() || "",
      email: data.get("email")?.trim() || "",
      company: data.get("company")?.trim() || "N/A",
      intent: data.get("intent") || "Other inquiries",
      resume: data.get("resumeRequest") || "No",
      message: data.get("message")?.trim() || ""
    };

    const subject = `4everinbeta contact (${payload.intent})`;
    const bodyLines = [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Company: ${payload.company}`,
      `Intent: ${payload.intent}`,
      `Resume/CV request: ${payload.resume}`,
      "",
      payload.message || "Message: (not provided)"
    ];
    const mailtoLink = `mailto:ryankbrown@gmail.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

    window.location.href = mailtoLink;
    if (status) {
      status.textContent = "Opening your email client… press send to finalize the note.";
    }
    form.reset();
  });
}
