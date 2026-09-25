import {registry} from '@jahia/ui-extender';
import register from './MultisiteManager.register';

export default function () {
    registry.add('callback', 'multisite-manager', {
        // After jcontent, whose accordion definitions and components this builds on
        targets: ['jahiaApp-init:3'],
        callback: register
    });
}
