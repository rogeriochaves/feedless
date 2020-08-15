//
//  LocakNotification.m
//  feedless
//
//  Created by Rogerio Chaves on 15/08/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

#include "LockNotification.h"
#import "notify.h"
#import <Foundation/Foundation.h>

@implementation LockNotification

-(void)registerAppforDetectLockState {

    int notify_token;
    NSLog(@"registering for lock");
    notify_register_dispatch("com.apple.springboard.lockstate", &notify_token,dispatch_get_main_queue(), ^(int token) {

        uint64_t state = UINT64_MAX;
        notify_get_state(token, &state);

        if(state == 0) {
            NSLog(@"unlock device");
        } else {
            NSLog(@"lock device");
        }

    });
}

@end
