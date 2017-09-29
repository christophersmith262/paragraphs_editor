<?php

namespace Drupal\paragraphs_editor\WidgetBinder\Generators;

use Drupal\Core\Render\RenderContext;
use Drupal\editor_assets\EditorAssetProcessorInterface;
use Drupal\paragraphs_editor\WidgetBinder\GeneratorBase;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * Generates 'asset' models based on the compiled markup.
 *
 * The asset models will be loaded using the 'editor_assets' module, allowing
 * the injection of Drupal asset libraries, including css, javascript, and
 * javascript settings, into the editor.
 */
class AssetGenerator extends GeneratorBase {

  /**
   * The asset processor to use for generating models.
   *
   * @var \Drupal\editor_assets\EditorAssetProcessorInterface
   */
  protected $assetProcessor;

  /**
   * Creates an AssetGenerator.
   *
   * @param \Drupal\editor_assets\EditorAssetProcessorInterface $asset_processor
   *   The processor to use to convert bubbled libraries to importable asset
   *   models.
   */
  public function __construct(EditorAssetProcessorInterface $asset_processor) {
    $this->assetProcessor = $asset_processor;
  }

  /**
   * {@inheritdoc}
   */
  public function id() {
    return 'asset';
  }

  /**
   * {@inheritdoc}
   */
  public function complete(WidgetBinderData $data, WidgetBinderDataCompilerState $state, RenderContext $render_context, $markup) {
    $attachments = $render_context->pop()->getAttachments();
    $assets = $this->assetProcessor->processAttachments($attachments);

    foreach ($assets as $id => $asset) {
      $asset['editorContextId'] = $state->getItemContext()->getAdditionalContext('editorContext');
      $data->addModel('asset', $id, $asset);
    }
  }

}
