<?php

namespace Drupal\paragraphs_editor;

/**
 * Manages the paragraphs editor field values.
 */
class ParagraphsEditorElements {

  /**
   * Element definitions for custom elements that can occur in an editor field.
   *
   * @var array
   */
  protected $elements;

  /**
   * Creates a field value manager object.
   *
   * @param array $elements
   *   An array of widget binder element definitions.
   */
  public function __construct(array $elements) {
    $this->elements = $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function getElement($element_name) {
    return isset($this->elements[$element_name]) ? $this->elements[$element_name] : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function getAttributeName($element_name, $attribute_name) {
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

  /**
   * {@inheritdoc}
   */
  public function getSelector($element_name) {
    $element = $this->getElement($element_name);
    $selector = !empty($element['tag']) ? $element['tag'] : '';
    if (!empty($element['attributes']['class'])) {
      $classes = explode(' ', $element['attributes']['class']);
      $selector .= '.' . implode('.', $classes);
    }
    return $selector;
  }

}
