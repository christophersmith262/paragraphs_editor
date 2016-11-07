<?php

use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\paragraphs_ckeditor\EditorMarkup\LexerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferInterface;

class MarkupCompiler {

  public function __construct(EntityStorageInterface $storage, LexerInterface $lexer, EditBufferInterface $buffer, array $embed_template) {
    $this->storage = $storage;
    $this->lexer = $lexer;
    $this->buffer = $buffer;
    $this->embedTemplate = $embed_template;
  }

  public function compile($markup) {
    $available_text_entities = $this->buffer->getItems($this->textBundle);
    $values = array();

    $last_entity = NULL;
    foreach ($filtered_tokens as $token) {

      // If its an existing entity that is being embedded, read it from the edit
      // buffer.
      if ($token->type == MarkupLexer::TOKEN_EMBED) {
        $item = $this->buffer->getItem($token->uuid);
        if ($item) {
          $entity = $item->getEntity();
          if (!isset($seen_entities[$entity->uuid()])) {
            $values[] = $entity;
          }

          // If an entity has been specifically referenced in an embed code, we
          // remove it from the list of entities available for allocation to
          // text tokens.
          unset($available_text_entities[$entity->uuid]);
        }
        else {
          $entity = NULL;
        }
      }

      // If its a text token, we pass it off to the text entity allocator.
      else if ($token->type == MarkupLexer::TOKEN_TEXT) {
        $entity = $this->allocateTextEntity($available_text_entities, $token->text);
        $values[] = $entity;
      }

      if ($entity) {
        $last_entity = $entity;
        $seen_entities[$entity->uuid()] = TRUE;
      }
    }

    return $values;
  }

  protected function allocateTextEntity(array &$available_text_entities, $text) {
    if ($available_text_entities) {
      $entity = reset($available_text_entities);
    }
    else {
      $entity = $this->storage->create(array(
        'type' => $this->textBundle,
      ));
    }
    $entity->getFieldDefinitions();
    return $entity;
  }

}
