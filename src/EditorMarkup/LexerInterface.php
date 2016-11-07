<?php

namespace Drupal\paragraphs_ckeditor\EditorMarkup;

interface LexerInterface {
  public function tokenize($markup);
}
