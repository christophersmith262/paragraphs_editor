<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

/**
 * Helper trait for working with Paragraphs Editor DOM Elements.
 */
trait ParagraphsEditorElementTrait {

  /**
   * The field value manager service for looking up element information.
   *
   * @var \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface
   */
  protected $fieldValueManager;

  /**
   * Injects field value manager service.
   *
   * @param \Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface $field_value_manager
   *   The field value manager service for looking up element information.
   */
  protected function initializeParagraphsEditorElementTrait(FieldValueManagerInterface $field_value_manager) {
    $this->fieldValueManager = $field_value_manager;
  }

  /**
   * Gets a selector for an element type.
   *
   * @param string $element_name
   *   The name of the element to get the selector for.
   *
   * @return string
   *   The selector for the element or NULL if no such element definition
   *   exists.
   */
  protected function getSelector($element_name) {
    return $this->fieldValueManager->getSelector($element_name);
  }

  /**
   * Gets an attribute value from a DOM object.
   *
   * @param \DOMNode $node
   *   The DOM node object to extract the attribute from.
   * @param string $element_name
   *   The name of the element to lookup the attribute for.
   * @param string $attribute_name
   *   The attribute name to extract.
   *
   * @return string
   *   The attribute value on the node, or NULL if no such attribute could be
   *   extracted.
   */
  protected function getAttribute(\DOMNode $node, $element_name, $attribute_name) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    return $key ? $node->getAttribute($key) : NULL;
  }

  /**
   * Sets an attribute value on a DOM object.
   *
   * @param \DOMNode $node
   *   The DOM node object to set the attribute for.
   * @param string $element_name
   *   The name of the element to lookup the attribute for.
   * @param string $attribute_name
   *   The attribute name to set.
   * @param string $value
   *   The value to be set on the node.
   */
  protected function setAttribute(\DOMNode $node, $element_name, $attribute_name, $value) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    $node->setAttribute($key, $value);
  }

  /**
   * Sets an attribute value on a DOM object.
   *
   * @param \DOMNode $node
   *   The DOM node object to remove the attribute for.
   * @param string $element_name
   *   The name of the element to lookup the attribute for.
   * @param string $attribute_name
   *   The name of the attribute to be removed.
   */
  protected function removeAttribute(\DOMNode $node, $element_name, $attribute_name) {
    $key = $this->fieldValueManager->getAttributeName($element_name, $attribute_name);
    $node->removeAttribute($key);
  }

  /**
   * Creates a DOM element from an element definition.
   *
   * @param \DOMDocument $document
   *   The document that will be used as a factory for creating the element.
   * @param string $element_name
   *   The name of the element type to create.
   * @param array $attributes
   *   A key value pair of attribute names and values to set on the newly
   *   created attribute.
   *
   * @return \DOMElement
   *   The newly created DOM Element.
   */
  protected function createElement(\DOMDocument $document, $element_name, array $attributes = []) {
    $node = $document->createElement($this->fieldValueManager->getElement($element_name)['tag']);
    foreach ($attributes as $key => $value) {
      $this->setAttribute($node, $element_name, $key, $value);
    }
    return $node;
  }

}
