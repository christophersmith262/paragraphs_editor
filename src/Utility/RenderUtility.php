<?php

namespace Drupal\paragraphs_editor\Utility;

use Drupal\Core\Field\FieldItemListInterface;

/**
 *
 */
class RenderUtility {

  /**
   *
   */
  public static function inEditor(array $variables) {
    return !!static::getCompilerState($variables);
  }

  /**
   *
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
   *
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
   *
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
