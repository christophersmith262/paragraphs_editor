<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;

class EmbedCodeAccountant implements EmbedCodeVisitorInterface {

  protected $entities = array();
  protected $editBuffer;

  public function __construct(EditBufferInterface $edit_buffer) {
    $this->editBuffer = $edit_buffer;
  }

  protected function getEntity($paragraph_uuid, $context_string) {
    $item = $this->editBuffer->getItem($paragraph_uuid);
    if ($item && $context_string == $this->editBuffer->getContextString()) {
      return $item->getEntity();
    }
    return NULL;
  }

  public function visit(\DOMNode $node, $paragraph_uuid, $context_string) {
    $entity = $this->getEntity($paragraph_uuid, $context_string);
    if ($entity) {
      $this->entities[$paragraph_uuid] = $entity;
    }
  }

  public function getEntities() {
    return $this->entities;
  }
}

class EmbedCodeInflator implements EmbedCodeVisitorInterface {

  public function __construct(EmbedCodeProcesserInterface $embed_code_processor, FieldValueWrapperInterface $root) {
    $this->embedCodeProcessor = $embed_code_processor;
    $this->root = $root;
  }

  public function visit(\DOMNode $node, $paragraph_uuid, $context_string) {
    $child = $this->root->getChild($paragraph_uuid);
    if ($child) {
      $child_inflator = new static($this->embedCodeProcessor, $child);
      $markup = $this->embedCodeProcessor->process($child->getMarkup(), $child_inflator);
      $fragment = $node->ownerDocument->createDocumentFragment();
      $fragment->appendXML('<paragraph-field data-context="">' .  $markup . '</paragraph-field>');
      $node->appendChild($fragment);
    }
  }
}

class EmbedCodeCompressor implements EmbedCodeVisitorInterface {

  public function visit(\DOMNode $node, $paragraph_uuid, $context_string) {
    while ($node->hasChildNodes()) {
      $node->removeChild($node->firstChild);
    }
    $node->removeAttribute('context');
  }
}
