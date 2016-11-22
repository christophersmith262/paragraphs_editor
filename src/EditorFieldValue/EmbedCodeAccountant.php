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
