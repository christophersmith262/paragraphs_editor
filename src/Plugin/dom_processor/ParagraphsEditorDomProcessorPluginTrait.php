<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;

trait ParagraphsEditorDomProcessorPluginTrait {

  protected $fieldValueManager;
  protected $elements;

  protected function initializeParagraphsEditorDomProcessorPlugin(FieldValueManagerInterface $field_value_manager, array $elements) {
    $this->fieldValueManager = $field_value_manager;
    $this->elements = $elements;
  }

  protected function getElement($element_name) {
    return isset($this->elements[$element_name]) ? $this->elements[$element_name] : NULL;
  }

  protected function getAttributeName($element_name, $attribute_name) {
    $element = $this->getElement($element_name);
    if (!empty($element['attributes'])) {
      $map = array_flip($element['attributes']);
      $key = !empty($map[$attribute_name]) ? $map[$attribute_name] : NULL;
      return $key;
    }
    else {
      return NULL;
    }
  }

  protected function getAttribute(SemanticDataInterface $data, $element_name, $attribute_name) {
    $key = $this->getAttributeName($element_name, $attribute_name);
    return $key ? $data->node()->getAttribute($key) : NULL;
  }

  protected function getSelector($element_name) {
    $element = $this->getElement($element_name);
    $selector = !empty($element['tag']) ? $element['tag'] : '';
    if (!empty($element['attributes']['class'])) {
      $classes = explode(' ', $element['attributes']['class']);
      $selector .= '.' . implode('.', $classes);
    }
    return $selector;
  }

  protected function is(SemanticDataInterface $data, $element_name) {
    return $data->is($this->getSelector($element_name));
  }

  protected function getReferencedEntities(SemanticDataInterface $data, $items) {
    $revision_cache = $data->get('cache.entity');
    if ($revision_cache) {

      $target_entities = [];
      foreach ($items as $delta => $item) {
        if ($item->hasNewEntity()) {
          $target_entities[$delta] = $item->entity;
        }
        elseif ($item->target_revision_id !== NULL) {
          $key = 'revision:' . $item->target_revision_id;
          if (empty($revision_cache[$key])) {
            throw new \Exception('Paragraph is not reachable from the render root!');
          }
          $target_entities[$delta] = $revision_cache[$key];
        }
      }

      return $target_entities;
    }
    else {
      return $items->referencedEntities();
    }
  }
}
