( function( $ ) {
	var $modules = $( document.getElementsByClassName( 'ep-modules' ) );
	var $errorOverlay = $( document.getElementsByClassName( 'error-overlay' ) );

	var $progressBar = $(document.getElementsByClassName( 'progress-bar' ) );
	var $syncStatusText = $(document.getElementsByClassName( 'sync-status' ) );
	var $startSyncButton = $(document.getElementsByClassName( 'start-sync' ) );
	var $resumeSyncButton = $(document.getElementsByClassName( 'resume-sync' ) );
	var $pauseSyncButton = $(document.getElementsByClassName( 'pause-sync' ) );
	var $cancelSyncButton = $(document.getElementsByClassName( 'cancel-sync' ) );

	var syncStatus = 'sync';
	var moduleSync = false;
	var currentSite;
	var siteStack;
	var processed = 0;
	var toProcess = 0;

	$modules.on( 'click', '.learn-more, .collapse', function( event ) {
		$module = $( this ).parents( '.ep-module' );
		$module.toggleClass( 'show-full' );
	} );

	$modules.on( 'click', '.settings-button', function( event ) {
		$module = $( this ).parents( '.ep-module' );
		$module.toggleClass( 'show-settings' );
	} );

	$modules.on( 'click', '.save-settings', function( event ) {
		event.preventDefault();

		var module = event.target.getAttribute( 'data-module' );
		var $module = $modules.find( '.ep-module-' + module );

		var settings = {};

		var $settings = $module.find('.setting-field');

		$settings.each(function() {
			var type = $( this ).attr( 'type' );
			var name = $( this ).attr( 'data-field-name' );
			var value = $( this ).attr( 'value' );

			if ( 'radio' === type ) {
				if ( $( this ).attr( 'checked' ) ) {
					settings[ name ] = value;
				}
			}
		});

		$module.addClass( 'saving' );

		$.ajax( {
			method: 'post',
			url: ajaxurl,
			data: {
				action: 'ep_save_module',
				module: module,
				nonce: ep.nonce,
				settings: settings
			}
		} ).done( function( response ) {
			setTimeout( function() {
				$module.removeClass( 'saving' );

				if ( '1' === settings.active ) {
					$module.addClass( 'module-active' );
				} else {
					$module.removeClass( 'module-active' );
				}
				
				if ( response.data.reindex ) {
					syncStatus = 'sync';

					$module.addClass( 'module-syncing' );

					moduleSync = module;

					sync();
				}
			}, 700 );
		} ).error( function() {
			setTimeout( function() {
				$module.removeClass( 'saving' );
				$module.removeClass( 'module-active' );
				$module.removeClass( 'module-syncing' );
			}, 700 );
		} );
	} );

	if ( ep.index_meta ) {
		if ( ep.index_meta.wpcli ) {
			syncStatus = 'wpcli';
			updateSyncDash();
		} else {
			processed = ep.index_meta.offset;
			toProcess = ep.index_meta['found_posts'];

			if ( ep.index_meta.module_sync ) {
				moduleSync = ep.index_meta.module_sync;
			}

			if ( ep.index_meta.current_site ) {
				currentSite = ep.index_meta.current_site;
			}

			if ( ep.index_meta.site_stack ) {
				siteStack = ep.index_meta.site_stack;
			}

			if ( siteStack && siteStack.length ) {
				// We are mid sync
				if ( ep.auto_start_index ) {
					syncStatus = 'sync';
					updateSyncDash();
					sync();
				} else {
					syncStatus = 'pause';
					updateSyncDash();
				}
			} else {
				if ( 0 === toProcess && ! ep.index_meta.start ) {
					// Sync finished
					syncStatus = 'finished';
					updateSyncDash();
				} else {
					// We are mid sync
					if ( ep.auto_start_index ) {
						syncStatus = 'sync';
						updateSyncDash();
						sync();
					} else {
						syncStatus = 'pause';
						updateSyncDash();
					}
				}
			}
		}
	}

	function updateSyncDash() {
		if ( 0 === processed ) {
			$progressBar.css( { width: '1%' } );
		} else {
			var width = parseInt( processed ) / parseInt( toProcess ) * 100;
			$progressBar.css( { width: width + '%' } );
		}

		if ( 'sync' === syncStatus ) {
			var text = ep.sync_syncing + ' ' + parseInt( processed ) + '/' + parseInt( toProcess );

			if ( currentSite ) {
				text += ' (' + currentSite.url + ')'
			}

			$syncStatusText.text( text );

			$syncStatusText.show();
			$progressBar.show();
			$pauseSyncButton.show();
			$errorOverlay.addClass( 'syncing' );

			$cancelSyncButton.hide();
			$resumeSyncButton.hide();
			$startSyncButton.hide();
		} else if ( 'pause' === syncStatus ) {
			var text = ep.sync_paused + ' ' + parseInt( processed ) + '/' + parseInt( toProcess );

			if ( currentSite ) {
				text += ' (' + currentSite.url + ')'
			}

			$syncStatusText.text( text );

			$syncStatusText.show();
			$progressBar.show();
			$pauseSyncButton.hide();
			$errorOverlay.addClass( 'syncing' );

			$cancelSyncButton.show();
			$resumeSyncButton.show();
			$startSyncButton.hide();
		} else if ( 'wpcli' === syncStatus ) {
			var text = ep.sync_wpcli;

			$syncStatusText.text( text );

			$syncStatusText.show();
			$progressBar.hide();
			$pauseSyncButton.hide();
			$errorOverlay.addClass( 'syncing' );

			$cancelSyncButton.hide();
			$resumeSyncButton.hide();
			$startSyncButton.hide();
		} else if ( 'error' === syncStatus ) {
			$syncStatusText.text( ep.sync_error );
			$syncStatusText.show();
			$startSyncButton.show();
			$cancelSyncButton.hide();
			$resumeSyncButton.hide();
			$pauseSyncButton.hide();
			$errorOverlay.removeClass( 'syncing' );
			$progressBar.hide();

			if ( moduleSync ) {
				var $module = $modules.find( '.ep-module-' + moduleSync );
				$module.removeClass( 'module-syncing' );
			}

			moduleSync = null;

			setTimeout( function() {
				$syncStatusText.hide();
			}, 7000 );
		} else if ( 'cancel' === syncStatus ) {
			$syncStatusText.hide();
			$progressBar.hide();
			$pauseSyncButton.hide();
			$errorOverlay.removeClass( 'syncing' );

			$cancelSyncButton.hide();
			$resumeSyncButton.hide();
			$startSyncButton.show();

			if ( moduleSync ) {
				var $module = $modules.find( '.ep-module-' + moduleSync );
				$module.removeClass( 'module-syncing' );
			}

			moduleSync = null;
		} else if ( 'finished' === syncStatus ) {
			$syncStatusText.text( ep.sync_complete );

			$syncStatusText.show();
			$progressBar.hide();
			$pauseSyncButton.hide();
			$cancelSyncButton.hide();
			$resumeSyncButton.hide();
			$startSyncButton.show();
			$errorOverlay.removeClass( 'syncing' );

			if ( moduleSync ) {
				var $module = $modules.find( '.ep-module-' + moduleSync );
				$module.removeClass( 'module-syncing' );
			}

			moduleSync = null;

			setTimeout( function() {
				$syncStatusText.hide();
			}, 7000 );
		}
	}

	function cancelSync() {
		$.ajax( {
			method: 'post',
			url: ajaxurl,
			data: {
				action: 'ep_cancel_index',
				nonce: ep.nonce
			}
		} );
	}

	function sync() {
		$.ajax( {
			method: 'post',
			url: ajaxurl,
			data: {
				action: 'ep_index',
				module_sync: moduleSync,
				nonce: ep.nonce
			}
		} ).done( function( response ) {
			if ( 'sync' !== syncStatus ) {
				return;
			}

			toProcess = response.data.found_posts;
			processed = response.data.offset;

			if ( response.data.site_stack ) {
				siteStack = response.data.site_stack;
			}

			if ( response.data.current_site ) {
				currentSite = response.data.current_site;
			}

			if ( siteStack && siteStack.length ) {
				// We are mid multisite sync
				syncStatus = 'sync';
				updateSyncDash();

				sync();
				return;
			}

			if ( 0 === response.data.found_posts && ! response.data.start ) {
				// Sync finished
				syncStatus = 'finished';
				updateSyncDash();
			} else {
				// We are starting a sync
				syncStatus = 'sync';
				updateSyncDash();

				sync();
			}
		} ).error( function( response ) {
			if ( response && response.status && parseInt( response.status ) >= 400 && parseInt( response.status ) < 600 ) {
				syncStatus = 'error';
				updateSyncDash();

				cancelSync();
			}
		});
	}

	$startSyncButton.on( 'click', function() {
		syncStatus = 'sync';

		sync();
	} );

	$pauseSyncButton.on( 'click', function() {
		syncStatus = 'pause';

		updateSyncDash();
	} );

	$resumeSyncButton.on( 'click', function() {
		syncStatus = 'sync';

		updateSyncDash();

		sync();
	} );

	$cancelSyncButton.on( 'click', function() {
		syncStatus = 'cancel';

		updateSyncDash();

		cancelSync();
	} );
	
} )( jQuery );
