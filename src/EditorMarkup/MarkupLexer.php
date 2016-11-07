<?php

namespace Drupal\paragraphs_ckeditor\EditorMarkup;

use Drupal\Component\Utility\Html;

class MarkupLexer implements LexerInterface {

  const TOKEN_TEXT = 'text';
  const TOKEN_EMBED = 'embed';

  protected $marker;
  protected $embedTemplate;

  public function __construct($context_string, array $embed_template) {
    $this->marker = Html::cleanCssIdentifier("paragraphs-ckeditor-embed-$context_string");
    $this->embedTemplate = $embed_template;
  }

  public function tokenize($markup) {
    $tokens = array();

    // Preprocess the markup to ensure valid html for embed codes.
    $markup = $this->preprocessEmbedCodes($markup);

    // Load a DOM document and associated xpath object so we can easily locate
    // embed codes within the document.
    $document = new \DOMDocument();
    $document->loadHTML($markup);
    $xpath = new \DOMXPath($document);

    $last_token = NULL;
    $body = $xpath->query('//body')->item(0);
    foreach ($body->childNodes as $node) {
      foreach ($this->sortBranches($node) as $subtree) {
        $last_token = $this->addToken($tokens, $document, $subtree, $last_token);
      }
    }

    return $tokens;
  }

  protected function addToken(array &$tokens, \DOMDocument $document, \DOMNode $node, \stdClass $last_token = NULL) {
    $token = new \stdClass();

    if ($this->isEmbedCodeElement($node)) {
      $token->type = self::TOKEN_EMBED;
      foreach ($this->embedTemplate['attributes'] as $key => $attribute_name) {
        if ($node->hasAttribute($attribute_name)) {
          $token->{$key} = $node->getAttribute($attribute_name);
        }
        else {
          $token->{$key} = NULL;
        }
      }
    }
    else {
      if (strtolower($node->nodeName) == 'body') {
        $text = $node->textContent;
      }
      else {
        $text = $document->saveHTML($node);
      }
      if ($last_token && $last_token->type == self::TOKEN_TEXT) {
        $last_token->text .= $text;
      }
      else {
        $token->type = self::TOKEN_TEXT;
        $token->text = $text;
      }
    }

    if (isset($token->type)) {
      $tokens[] = $token;
      $last_token = $token;
    }

    return $last_token;
  }

  protected function saveBranch(array &$branches, \DOMNode $current, \DOMNode $template, $flush = FALSE) {
    if ($current->hasChildNodes()) {
      $flush = TRUE;
    }

    if ($current->nodeType == XML_TEXT_NODE && empty(trim($current->textContent))) {
      $flush = FALSE;
    }

    if ($flush) {
      $branches[] = $current;
      return $template->cloneNode(FALSE);
    }

    return $current;
  }

  protected function sortBranches(\DOMNode $node) {
    $branches = array();
    $current = $node->cloneNode(FALSE);

    if ($node->hasChildNodes()) {
      foreach ($node->childNodes as $child) {
        foreach ($this->sortBranches($child) as $branch) {
          if ($this->isEmbedCodeElement($branch)) {
            $current = $this->saveBranch($branches, $current, $node);
            $branches[] = $branch;
          }
          else {
            $current->appendChild($branch);
          }
        }
      }
      $force = FALSE;
    }
    else {
      $force = TRUE;
    }

    $current = $this->saveBranch($branches, $current, $node, $force);
    return $branches;
  }

  protected function isEmbedCodeElement(\DOMNode $element) {
    $is_embedded = FALSE;
    if ($element->nodeName == 'div' && $element->hasAttribute('class')) {
      $classes = explode(' ', $element->getAttribute('class'));
      if (in_array($this->marker, $classes)) {
        $is_embedded = TRUE;
      }
    }
    return $is_embedded;
  }

  protected function preprocessEmbedCodes($markup) {
    $tag = $this->embedTemplate['tag'];
    $markup = preg_replace('/<' . $tag . '/', '<div class="' . $this->marker . '"', $markup);

    if ($this->embedTemplate['close']) {
      $markup = preg_replace('/' . $tag . '>/', 'div>', $markup);
    }

    return $markup;
  }
}
