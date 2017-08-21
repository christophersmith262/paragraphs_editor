<?php

namespace Drupal\paragraphs_editor\Plugin\dom_processor;

use Drupal\dom_processor\DomProcessor\SemanticDataInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;

/**
 *
 */
trait ParagraphsEditorDomProcessorPluginTrait {

  protected $fieldValueManager;

  /**
   *
   */
  protected function initializeParagraphsEditorDomProcessorPlugin(FieldValueManagerInterface $field_value_manager) {
    $this->fieldValueManager = $field_value_manager;
  }

  /**
   *
   */
  protected function is(SemanticDataInterface $data, $element_name) {
    return $data->is($this->fieldValueManager->getSelector($element_name));
  }

  /**
   *
   */
  protected function getAttribute(\DOMNode $node, $element_name, $attribute_name) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    return $key ? $node->getAttribute($key) : NULL;
  }

  /**
   *
   */
  protected function setAttribute(\DOMNode $node, $element_name, $attribute_name, $value) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    $node->setAttribute($key, $value);
  }

  /**
   *
   */
  protected function removeAttribute(\DOMNode $node, $element_name, $attribute_name) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    $node->removeAttribute($key);
  }

  /**
   *
   */
  protected function createElement(\DOMDocument $document, $element_name, array $attributes = []) {
    $node = $document->createElement($this->fieldValueManager->getElement($element_name)['tag']);
    foreach ($attributes as $key => $value) {
      $this->setAttribute($node, $element_name, $key, $value);
    }
    return $node;
  }

}
