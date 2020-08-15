#ifndef NodeRunner_h
#define NodeRunner_h
#import <Foundation/Foundation.h>

@interface NodeRunner : NSObject {}
+ (void) startEngineWithArguments:(NSArray*)arguments;
+ (void) sendControlMessage:(NSString*)message;
@end

#endif
