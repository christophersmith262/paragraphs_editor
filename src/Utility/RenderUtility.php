<?php

namespace Drupal\paragraphs_editor\Utility;

use Drupal\Core\Field\FieldItemListInterface;

/**
 * Helper methods for rendering paragraphs editor paragraphs.
 *
 * In most cases you shouldn't need to use these methods as the render array
 * will be set up with the correct attributes and properties during
 * preprocessing.
 *
 * Using this class may become necessary if you decide not to use Drupal's
 * default field rendering and instead render data directly from the paragraph
 * entity. You may also use it to access any data that was created during widget
 * data compilation.
 */
class RenderUtility {

  /**
   * Determines whether a template is being rendered for editor consumption.
   *
   * @param array $variables
   *   An array of variables passed to a preprocess function.
   *
   * @return bool
   *   TRUE if the template is being rendered within the editor, FALSE
   *   otherwise.
   */
  public static function inEditor(array $variables) {
    return !!static::getCompilerState($variables);
  }

  /**
   * Gets the editor data compiler state object in a preprocess function.
   *
   * @param array $variables
   *   An array of variables passed to a preprocess function.
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState
   *   The state object containing all the editor metadata associated with the
   *   template.
   */
  public static function getCompilerState(array $variables) {
    if (!empty($variables['element']['#paragraphs_editor_state'])) {
      return $variables['element']['#paragraphs_editor_state'];
    }
    if (!empty($variables['elements']['#paragraphs_editor_state'])) {
      return $variables['elements']['#paragraphs_editor_state'];
    }
    else {
      return NULL;
    }
  }

  /**
   * Preprocesses field items to attach inline editing information.
   *
   * This should be called from hook_preprocess_field().
   *
   * @param array $variables
   *   An array of variables passed to a preprocess function.
   */
  public static function preprocessField(array &$variables) {
    $editable = static::getEditableData($variables, $variables['element']['#items']);
    if ($editable && !empty($variables['items'])) {
      foreach ($variables['items'] as $delta => $value) {
        if (!$delta) {
          $editable->preprocessField($variables['items'][$delta]);
        }
        else {
          unset($variables['items'][$delta]);
        }
      }
    }
  }

  /**
   * Gets the inline editing information for a template.
   *
   * @param array $variables
   *   An array of variables passed to a preprocess function.
   * @param \Drupal\Core\Field\FieldItemListInterface $items
   *   An optional field object to get the information for. If this is not
   *   passed the field items will be extracted from the render array. Passing
   *   NULL is only supported when this is called from hook_preprocess_field().
   *
   * @return \Drupal\paragraphs_editor\WidgetBinder\EditableField
   *   An object containing the inline editing information, or NULL if no such
   *   information was compiled for this template.
   */
  public static function getEditableData(array $variables, FieldItemListInterface $items = NULL) {
    if (!$items && isset($variables['element']['#items'])) {
      $items = $variables['element']['#items'];
    }
    $state = static::getCompilerState($variables);
    if ($state) {
      return $state->getGenerator('editable')->getEditable($state, $items);
    }
  }

}
