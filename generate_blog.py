"""Generate static journal pages from blog_posts.json."""
from __future__ import annotations

import html
import json
import re
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import List, Dict

POSTS_JSON = Path("blog_posts.json")
BLOG_DIR = Path("blog")


def load_posts() -> List[Dict[str, str]]:
    data = json.loads(POSTS_JSON.read_text())
    posts = []
    for item in data:
        post = dict(item)
        dt = parse_date(post.get("pubDate", ""))
        post["dateFormatted"] = dt.strftime("%b %d, %Y") if dt else post.get("pubDate", "")
        post["excerpt"] = clean_excerpt(post.get("description", ""))
        posts.append(post)
    posts.sort(key=lambda p: parse_date(p.get("pubDate", "")) or 0, reverse=True)
    return posts


def parse_date(value: str):
    try:
        return parsedate_to_datetime(value)
    except Exception:
        return None


def clean_excerpt(text: str) -> str:
    text = html.unescape(text or "")
    return re.sub(r"<[^<]+?>", "", text).strip()


def nav(prefix: str = "") -> str:
    return f"""      <header class=\"nav\">
        <a class=\"nav__brand\" href=\"{prefix}index.html\" aria-label=\"Ryan Brown, 4everinbeta\">
          <img src=\"{prefix}logo-name-horizontal-white-transbg.png\" alt=\"4everinbeta logo\" class=\"nav__logo\" />
          <span class=\"nav__name\">Ryan Brown</span>
        </a>
        <div class=\"nav__links\">
          <a href=\"{prefix}index.html#impact\">Impact</a>
          <a href=\"{prefix}index.html#career\">Career</a>
          <a href=\"{prefix}index.html#focus\">Focus Areas</a>
          <a href=\"{prefix}index.html#contact\">Connect</a>
          <a href=\"{prefix}4everinbeta.html\">Why 4everinbeta</a>
          <a href=\"{prefix}blog.html\">Journal</a>
        </div>
      </header>"""


def build_list_page(posts: List[Dict[str, str]]):
    cards = []
    for post in posts:
        cards.append(
            f"""          <article class=\"card card--post\">
            <p class=\"post-date\">{post['dateFormatted']}</p>
            <h3><a href=\"blog/{post['slug']}.html\">{html.escape(post['title'])}</a></h3>
            <p>{html.escape(post['excerpt'])}</p>
            <a class=\"text-link\" href=\"blog/{post['slug']}.html\">Read essay</a>
          </article>"""
        )

    template = """<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>Journal | 4everinbeta</title>
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\" rel=\"stylesheet\" />
    <link rel=\"stylesheet\" href=\"styles.css\" />
    <script defer src=\"chat.js\"></script>
  </head>
  <body class=\"page page--blog\">
    <main>
{nav}
      <section class=\"hero\">
        <p class=\"hero__eyebrow\">Journal</p>
        <h1>Snapshots from the 4everinbeta journey.</h1>
        <p class=\"hero__intro\">
          Essays exploring leadership lessons, DevOps experiments, and deeply personal reflections on
          technology, career, and life in perpetual beta.
        </p>
      </section>
      <section class=\"section\">
        <p class=\"section__title\">All entries</p>
        <div class=\"card-grid blog-grid\">
{cards}
        </div>
      </section>
    </main>
    <footer>
      <div class=\"footer-links\">
        <span>Castle Pines, CO</span>
        <span>·</span>
        <a href=\"4everinbeta.html\">Origin story</a>
        <span>·</span>
        <a href=\"blog.html\">Journal</a>
        <span>·</span>
        <a href=\"mailto:ryankbrown@gmail.com\">ryankbrown@gmail.com</a>
      </div>
    </footer>
  </body>
</html>
"""
    Path("blog.html").write_text(template.format(nav=nav(""), cards="\n".join(cards)))


def build_post_pages(posts: List[Dict[str, str]]):
    BLOG_DIR.mkdir(exist_ok=True)
    template = """<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{title} | 4everinbeta Journal</title>
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\" rel=\"stylesheet\" />
    <link rel=\"stylesheet\" href=\"../styles.css\" />
    <script defer src=\"../chat.js\"></script>
  </head>
  <body class=\"page page--post\">
    <main>
{nav}
      <section class=\"hero\">
        <p class=\"hero__eyebrow\">{date}</p>
        <h1>{title}</h1>
        <p class=\"hero__intro\">Originally published on <a href=\"{link}\" target=\"_blank\" rel=\"noopener\">4everinbeta.com</a>.</p>
      </section>
      <article class=\"surface post\">
        <div class=\"post-content\">
{content}
        </div>
        <div class=\"post-footer\">
          <a class=\"text-link text-link--back\" href=\"../blog.html\">Back to all entries</a>
        </div>
      </article>
    </main>
    <footer>
      <div class=\"footer-links\">
        <span>Castle Pines, CO</span>
        <span>·</span>
        <a href=\"../4everinbeta.html\">Origin story</a>
        <span>·</span>
        <a href=\"../blog.html\">Journal</a>
        <span>·</span>
        <a href=\"mailto:ryankbrown@gmail.com\">ryankbrown@gmail.com</a>
      </div>
    </footer>
  </body>
</html>
"""
    for post in posts:
        page = template.format(
            nav=nav("../"),
            date=post["dateFormatted"],
            title=html.escape(post["title"]),
            link=post["link"],
            content=post["content"],
        )
        (BLOG_DIR / f"{post['slug']}.html").write_text(page)


def main():
    posts = load_posts()
    build_list_page(posts)
    build_post_pages(posts)
    print(f"Generated {len(posts)} posts into /blog and blog.html")


if __name__ == "__main__":
    main()
