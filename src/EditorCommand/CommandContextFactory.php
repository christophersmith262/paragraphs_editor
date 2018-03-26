<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Component\Utility\Crypt;
use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface;
use Drupal\paragraphs_editor\Utility\TypeUtility;

/**
 * The default command context factory.
 *
 * @see Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
 */
class CommandContextFactory implements CommandContextFactoryInterface {

  /**
   * The entity type manager for looking up entity info.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The buffer cache for looking up existing edit buffers.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface
   */
  protected $bufferCache;

  /**
   * The field config storage handler.
   *
   * @var \Drupal\Core\Entity\EntityStorageInterface
   */
  protected $fieldConfigStorage;

  /**
   * The bundle selector plugin manager.
   *
   * @var \Drupal\Component\Plugin\PluginManagerInterface
   */
  protected $bundleSelectorManager;

  /**
   * The delivery provider plugin manager.
   *
   * @var \Drupal\Component\Plugin\PluginManagerInterface
   */
  protected $deliveryProviderManager;

  /**
   * The entity bundle info service.
   *
   * @var \Drupal\Core\Entity\EntityTypeBundleInfoInterface
   */
  protected $bundleInfo;

  /**
   * Create a command context factory object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager to use for looking up the entities and fields.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface $buffer_cache
   *   The edit buffer cache to use for looking up existing edit buffers that
   *   have been persisted in the database cache.
   * @param \Drupal\Core\Entity\EntityTypeBundleInfoInterface $bundle_info
   *   The bundle manager service for creating paragraph bundle filters.
   * @param \Drupal\Component\Plugin\PluginManagerInterface $bundle_selector_manager
   *   The bundle selector plugin manager service.
   * @param \Drupal\Component\Plugin\PluginManagerInterface $delivery_provider_manager
   *   The delivery provider plugin manager service.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, EditBufferCacheInterface $buffer_cache, EntityTypeBundleInfoInterface $bundle_info, PluginManagerInterface $bundle_selector_manager, PluginManagerInterface $delivery_provider_manager) {
    $this->entityTypeManager = $entity_type_manager;
    $this->bufferCache = $buffer_cache;
    $this->fieldConfigStorage = $entity_type_manager->getStorage('field_config');
    $this->bundleSelectorManager = $bundle_selector_manager;
    $this->deliveryProviderManager = $delivery_provider_manager;
    $this->bundleInfo = $bundle_info;
  }

  /**
   * {@inheritdoc}
   */
  public function parseContextString($context_string) {
    $context_params = explode(':', $context_string);
    $field_config_id = array_shift($context_params);
    $widget_build_id = array_shift($context_params);
    $entity_id = array_shift($context_params);
    return [$field_config_id, $widget_build_id, $entity_id];
  }

  /**
   * {@inheritdoc}
   */
  public function get($context_id) {
    list($field_config_id, $widget_build_id, $entity_id) = $this->parseContextString($context_id);
    return $field_config_id && $widget_build_id ? $this->create($field_config_id, $entity_id, [], $widget_build_id) : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function create($field_config_id, $entity_id, array $settings = [], $widget_build_id = NULL, $edit_buffer_prototype = NULL) {

    // If a widget build id isn't specified, we create a new one.
    if (empty($widget_build_id)) {
      $widget_build_id = $this->generateBuildId();
    }

    // If any exceptions are thrown while initializing any of the properties, we
    // return an "Invalid Command" context to signal that something is wrong
    // with the command and execution should be aborted. We do this instead of
    // bubbling the exception so that the controller access handler can deal
    // with it instead of the core exception handling.
    try {
      $context_keys = [$field_config_id, $widget_build_id];
      $field_config = TypeUtility::ensureFieldConfig($this->fieldConfigStorage->load($field_config_id));
      $settings = $field_config->getThirdPartySettings('paragraphs_editor') + [
        'allowed_bundles' => $this->getAllowedBundles($field_config),
      ] + $settings;
      $entity_type = $field_config->getTargetEntityTypeId();
      $entity_storage = $this->entityTypeManager->getStorage($entity_type);

      if ($entity_id) {
        $entity = $entity_storage->load($entity_id);
        $context_keys[] = $entity_id;
      }
      else {
        $entity = NULL;
      }

      $context_string = implode(':', $context_keys);
      if ($edit_buffer_prototype) {
        $edit_buffer = $edit_buffer_prototype->createCopy($context_string);
      }
      else {
        $edit_buffer = $this->bufferCache->get($context_string);
      }
      $context = new CommandContext($entity, $field_config, $edit_buffer, $settings);
      $this->attachPlugin('delivery_provider', $settings, $context);
      $this->attachPlugin('bundle_selector', $settings, $context);
    }
    catch (\Exception $e) {
      return new InvalidCommandContext();
    }
    return $context;
  }

  /**
   * {@inheritdoc}
   */
  public function regenerate(CommandContextInterface $from) {
    $field_config_id = $from->getFieldConfig()->id();
    $entity_id = $from->getEntity() ? $from->getEntity()->id() : NULL;
    $settings = $from->getSettings();
    $widget_build_id = $this->generateBuildId();
    $to = $this->create($field_config_id, $entity_id, $settings, $widget_build_id, $from->getEditBuffer());
    $to->getEditBuffer()->save();
    $this->free($from);
    return $to;
  }

  /**
   * {@inheritdoc}
   */
  public function free(CommandContextInterface $context) {
    $this->bufferCache->delete($context->getContextString());
  }

  /**
   * {@inheritdoc}
   */
  public function getPluginManager($type) {
    if ($type == 'bundle_selector') {
      return $this->bundleSelectorManager;
    }
    elseif ($type == 'delivery_provider') {
      return $this->deliveryProviderManager;
    }
    else {
      return NULL;
    }
  }

  /**
   * {@inheritdoc}
   */
  public function getAllowedBundles(FieldConfigInterface $field_config) {
    $settings = $field_config->getThirdPartySetting('paragraphs_editor', 'handler_settings', []);
    $return_bundles = [];

    $bundles = $this->bundleInfo->getBundleInfo('paragraph');
    if (isset($settings['target_bundles'])) {
      $bundles = array_intersect_key($bundles, $settings['target_bundles']);
    }

    // Support for the paragraphs reference type.
    if (!empty($settings['target_bundles_drag_drop'])) {
      $drag_drop_settings = $settings['target_bundles_drag_drop'];
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

    uasort($return_bundles, 'Drupal\Component\Utility\SortArray::sortByWeightElement');

    return $return_bundles;
  }

  /**
   * Helper function for instantiating plugin instances for a command context.
   *
   * @param string $type
   *   The type of plugin to be attached.
   * @param array $settings
   *   The field widget settings specifying which plugin to use.
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context to attach the instantiated plugin to.
   */
  protected function attachPlugin($type, array $settings, CommandContextInterface $context) {
    $plugin_name = isset($settings[$type]) ? $settings[$type] : '';
    if ($plugin_name) {
      $plugin = $this->getPluginManager($type)->createInstance($plugin_name, [
        'context' => $context,
      ]);
      $context->setPlugin($type, $plugin);
    }
  }

  /**
   * Generates a build id when new contexts are created.
   *
   * @return string
   *   The newly created build id.
   */
  protected function generateBuildId() {
    return Crypt::randomBytesBase64();
  }

}
