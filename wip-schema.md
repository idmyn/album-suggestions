### ai_responses

- id
- prompt
- schema
- model
- created_at
- output

### album_suggestions

- id
- ai_prompt_id
- album_id
- blurb
- ?? reviewers_say
- ?? components (jsonb: [{title: 'Reviewers say', content: 'blah', 'annotations': []}, ...])
  - https://openrouter.ai/docs/features/web-search#parsing-web-search-results

### albums

- id (spotify)
- name
- artist_ids

### artists

- id (spotify)
- name
