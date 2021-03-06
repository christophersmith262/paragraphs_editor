<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Entity\Query\QueryInterface;
use Drupal\Core\Field\FieldConfigInterface;

/**
 * A class for filtering which paragraph types can be nested in other types.
 */
class ParagraphBundleFilter implements ParagraphBundleFilterInterface {

  /**
   * The text bundle for the field this filter is for.
   *
   * @var string
   */
  protected $textBundle;

  /**
   * The list of allowed nested bundles in the field this filter is for.
   *
   * @var string[]
   */
  protected $allowedBundles;

  /**
   * Creates a bundle filter object.
   *
   * @param \Drupal\Core\Entity\EntityTypeBundleInfoInterface $bundle_info
   *   The bundle manager service.
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The definition for the field this filter is for.
   */
  public function __construct(EntityTypeBundleInfoInterface $bundle_info, FieldConfigInterface $field_config) {
    $this->textBundle = $this->extractTextBundle($field_config);
    $this->allowedBundles = $this->extractAllowedBundles($bundle_info, $field_config);
  }

  /**
   * {@inheritdoc}
   */
  public function filterQuery(QueryInterface $query) {
    $query->condition('id', array_keys($this->getAllowedBundles()), 'IN')
      ->condition('id', $this->getTextBundle(), '<>');
  }

  /**
   * {@inheritdoc}
   */
  public function getTextBundle() {
    return $this->textBundle;
  }

  /**
   * {@inheritdoc}
   */
  public function getAllowedBundles() {
    return $this->allowedBundles;
  }

  /**
   * Builds the list of allowed bundles for a given field definition.
   *
   * @param \Drupal\Core\Entity\EntityTypeBundleInfoInterface $bundle_info
   *   The bundle manager to read bundle information from.
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The field to build the list for.
   *
   * @return array
   *   A map where keys are allowed bundle machine names and values are maps
   *   containing the 'label' of the bundles and the 'weight' of the bundle as
   *   shown in the admin UI.
   */
  protected function extractAllowedBundles(EntityTypeBundleInfoInterface $bundle_info, FieldConfigInterface $field_config) {
    $return_bundles = [];

    $target_type = $field_config->getSetting('target_type');
    $bundles = $bundle_info->getBundleInfo($target_type);

    if ($this->getSelectionHandlerSetting($field_config, 'target_bundles') !== NULL) {
      $bundles = array_intersect_key($bundles, $this->getSelectionHandlerSetting($field_config, 'target_bundles'));
    }

    // Support for the paragraphs reference type.
    $drag_drop_settings = $this->getSelectionHandlerSetting($field_config, 'target_bundles_drag_drop');
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
        if (!count($this->getSelectionHandlerSetting($field_config, 'target_bundles'))
          || in_array($machine_name, $this->getSelectionHandlerSetting($field_config, 'target_bundles'))) {

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
   * Reads the text bundle name from a field definition.
   *
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The definition to read from.
   *
   * @return string
   *   The text bundle name.
   */
  protected function extractTextBundle(FieldConfigInterface $field_config) {
    return $field_config->getThirdPartySetting('paragraphs_editor', 'text_bundle');
  }

  /**
   * Reads a setting entry from the field's handler plugin.
   *
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The definition to read from.
   * @param string $setting_name
   *   The setting to read.
   */
  protected function getSelectionHandlerSetting(FieldConfigInterface $field_config, $setting_name) {
    $settings = $field_config->getSetting('handler_settings');
    return isset($settings[$setting_name]) ? $settings[$setting_name] : NULL;
  }

}
