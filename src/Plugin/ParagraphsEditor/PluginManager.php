<?php

namespace Drupal\paragraphs_editor\Plugin\ParagraphsEditor;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;

/**
 * Provides a common plugin manager for all paragraphs_editor plugins.
 */
class PluginManager extends DefaultPluginManager {

  /**
   * {@inheritdoc}
   */
  public function __construct($type, \Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    list ($plugin_interface, $annotation) = $this->getPluginTypeInfo($type);
    parent::__construct("Plugin/ParagraphsEditor/$type", $namespaces, $module_handler, $plugin_interface, $annotation);
    $this->alterInfo("paragraphs_editor_{$type}_info");
    $this->setCacheBackend($cache_backend, "paragraphs_editor_{$type}_info_plugins");
    $this->factory = new PluginFactory($this->getDiscovery());
  }

  /**
   * Helper method to map plugin types to interfaces / annotations.
   *
   * @param string $type
   *   The paragraphs_editor plugin type.
   *
   * @return array
   *   A tuple where the first element is the fully qualified interface name and
   *   the second element is the fully qualified annotation name.
   */
  protected function getPluginTypeInfo($type) {
    switch ($type) {
      case 'delivery_provider':
        return [
          'Drupal\paragraphs_editor\Plugin\ParagraphsEditor\DeliveryProviderInterface',
          'Drupal\paragraphs_editor\Annotation\ParagraphsEditorDeliveryProvider',
        ];

      case 'bundle_selector':
        return [
          'Drupal\paragraphs_editor\Plugin\ParagraphsEditor\BundleSelectorInterface',
          'Drupal\paragraphs_editor\Annotation\ParagraphsEditorBundleSelector',
        ];

      default:
        throw new \Exception("Invalid plugin type '$type'");
    }
  }

}
