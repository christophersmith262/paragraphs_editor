<?php

namespace Drupal\paragraphs_editor\WidgetBinder;

use Drupal\Core\Template\Attribute;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * Represents a nested (inline) editable within an edit buffer item.
 */
class EditableField {

  /**
   * The context the editable's edits are stored in.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   */
  protected $context;

  /**
   * The markup to render inside the editable area.
   *
   * @var string
   */
  protected $markup;

  /**
   * The attributes to attach to the editable area.
   *
   * @var array
   */
  protected $attributes;

  /**
   * Tracks whether inline editing has already been applied for this editable.
   *
   * @var bool
   */
  protected $applied = FALSE;

  /**
   * Creates an EditableField object.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context that the editable is associated with. Edits will be stored in
   *   the edit buffer for this context.
   * @param string $markup
   *   The current field contents for the editable.
   * @param array $attributes
   *   Attributes to be attached when rendering the editable area. These
   *   attributes will flag that this is an editable field and where the edits
   *   are persisted.
   */
  public function __construct(CommandContextInterface $context, $markup, array $attributes) {
    $this->context = $context;
    $this->markup = $markup;
    $this->attributes = $attributes;
  }

  /**
   * Applies inline editable attributes and content to a field's render data.
   *
   * This is the default for applying inline editing. It can be used within
   * hook_preprocess_field() to apply inline editing to a field.
   */
  public function preprocessField(array &$field_element) {
    if (empty($field_element['attributes'])) {
      $field_element['attributes'] = $this->getAttributes();
    }
    else {
      $this->applyAttributes($field_element['attributes']);
    }
    $field_element['content'] = $this->getMarkup();
    $this->applied = TRUE;
  }

  /**
   * Returns whether the editable has been rendered.
   *
   * @return bool
   *   True if the editable attributes and markup has already been applied,
   *   FALSE otherwise.
   */
  public function isApplied() {
    return $this->applied;
  }

  /**
   * Getter for the context containing the edits for this editable.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   The context containing edits for this editable.
   */
  public function getContext() {
    return $this->context;
  }

  /**
   * Getter for markup to render inside this editable.
   *
   * @return string
   *   The editor markup to display inside the editable.
   */
  public function getMarkup() {
    return $this->markup;
  }

  /**
   * Gets a Drupal attributes object containing the editable's attributes.
   *
   * @return \Drupal\Core\Template\Attribute
   *   A Drupal Attribute object to be applied to the editable area.
   */
  public function getAttributes() {
    $attributes = new Attribute();
    return $this->applyAttributes($attributes);
  }

  /**
   * Applies the inline editing attributes to an existing attributes object.
   *
   * @return \Drupal\Core\Template\Attribute
   *   The updated Drupal Attribute object.
   */
  public function applyAttributes(Attribute $attributes) {
    foreach ($this->attributes as $name => $value) {
      if ($name == 'class') {
        foreach ($value as $class) {
          $attributes->addClass($class);
        }
      }
      else {
        $attributes->setAttribute($name, $value);
      }
    }
    return $attributes;
  }

  /**
   * Applies the inline editing attributes to a render element.
   *
   * @param array &$element
   *   The element to apply the attributes to.
   */
  public function attachAttributes(array &$element) {
    foreach ($this->attributes as $name => $value) {
      if ($name == 'class') {
        foreach ($value as $class) {
          $element['#attributes']['class'][] = $class;
        }
      }
      else {
        $element['#attributes'][$name] = $value;
      }
    }
  }

}
