<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Entity\Query\QueryInterface;
use Drupal\Core\Field\FieldDefinitionInterface;

/**
 *
 */
class ParagraphBundleFilter implements ParagraphBundleFilterInterface {

  protected $textBundle;
  protected $allowedBundles;

  /**
   *
   */
  public function __construct(EntityTypeBundleInfoInterface $bundle_info, FieldDefinitionInterface $field_definition) {
    $this->textBundle = $this->extractTextBundle($field_definition);
    $this->allowedBundles = $this->extractAllowedBundles($bundle_info, $field_definition);
  }

  /**
   *
   */
  public function filterQuery(QueryInterface $query) {
    $query->condition('id', array_keys($this->getAllowedBundles()), 'IN')
      ->condition('id', $this->getTextBundle(), '<>');
  }

  /**
   *
   */
  public function getTextBundle() {
    return $this->textBundle;
  }

  /**
   *
   */
  public function getAllowedBundles() {
    return $this->allowedBundles;
  }

  /**
   *
   */
  protected function extractAllowedBundles(EntityTypeBundleInfoInterface $bundle_info, FieldDefinitionInterface $field_definition) {
    $return_bundles = [];

    $target_type = $field_definition->getSetting('target_type');
    $bundles = $bundle_info->getBundleInfo($target_type);

    if ($this->getSelectionHandlerSetting($field_definition, 'target_bundles') !== NULL) {
      $bundles = array_intersect_key($bundles, $this->getSelectionHandlerSetting($field_definition, 'target_bundles'));
    }

    // Support for the paragraphs reference type.
    $drag_drop_settings = $this->getSelectionHandlerSetting($field_definition, 'target_bundles_drag_drop');
    if ($drag_drop_settings) {
      $max_weight = count($bundles);

      foreach ($drag_drop_settings as $bundle_info) {
        if (isset($bundle_info['weight']) && $bundle_info['weight'] && $bundle_info['weight'] > $max_weight) {
          $max_weight = $bundle_info['weight'];
        }
      }

      // Default weight for new items.
      $weight = $max_weight + 1;
      foreach ($bundles as $machine_name => $bundle) {
        $return_bundles[$machine_name] = [
          'label' => $bundle['label'],
          'weight' => isset($drag_drop_settings[$machine_name]['weight']) ? $drag_drop_settings[$machine_name]['weight'] : $weight,
        ];
        $weight++;
      }
    }
    // Support for other reference types.
    else {
      $weight = 0;
      foreach ($bundles as $machine_name => $bundle) {
        if (!count($this->getSelectionHandlerSetting($field_definition, 'target_bundles'))
          || in_array($machine_name, $this->getSelectionHandlerSetting($field_definition, 'target_bundles'))) {

          $return_bundles[$machine_name] = [
            'label' => $bundle['label'],
            'weight' => $weight,
          ];

          $weight++;
        }
      }
    }

    uasort($return_bundles, 'Drupal\Component\Utility\SortArray::sortByWeightElement');

    return $return_bundles;
  }

  /**
   *
   */
  protected function extractTextBundle(FieldDefinitionInterface $field_definition) {
    return $field_definition->getThirdPartySetting('paragraphs_editor', 'text_bundle');
  }

  /**
   *
   */
  protected function getSelectionHandlerSetting(FieldDefinitionInterface $field_definition, $setting_name) {
    $settings = $field_definition->getSetting('handler_settings');
    return isset($settings[$setting_name]) ? $settings[$setting_name] : NULL;
  }

}
