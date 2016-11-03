<?php

namespace Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;

/**
 * Provides a common plugin manager for all paragraphs_ckeditor plugins.
 */
class PluginManager extends DefaultPluginManager {

  /**
   * {@inheritdoc}
   */
  public function __construct($type, \Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    list ($plugin_interface, $annotation) = $this->getPluginTypeInfo($type);
    parent::__construct("Plugin/ParagraphsCKEditor/$type", $namespaces, $module_handler, $plugin_interface, $annotation);
    $this->alterInfo("paragraphs_ckeditor_{$type}_info");
    $this->setCacheBackend($cache_backend, "paragraphs_ckeditor_{$type}_info_plugins");
    $this->factory = new PluginFactory($this->getDiscovery());
  }

  /**
   * Helper method to map plugin types to interfaces / annotations.
   *
   * @param string type
   *   The paragraphs_ckeditor plugin type.
   *
   * @return array
   *   A tuple where the first element is the fully qualified interface name and
   *   the second element is the fully qualified annotation name.
   */
  protected function getPluginTypeInfo($type) {
    switch ($type) {
      case 'delivery_provider':
        return array(
          'Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\DeliveryProviderInterface',
          'Drupal\paragraphs_ckeditor\Annotation\ParagraphsCKEditorDeliveryProvider'
        );
      case 'bundle_selector':
        return array(
          'Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\BundleSelectorInterface',
          'Drupal\paragraphs_ckeditor\Annotation\ParagraphsCKEditorBundleSelector'
        );
      default:
        throw new \Exception("Invalid plugin type '$type'");
    }
  }

}
